import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migrateSimulatorDatabase } from '../../src/database/migrate.js';
import { AccountRepository } from '../../src/modules/account/account.repository.js';
import { DrizzleScenarioRepository } from '../../src/modules/scenario/infrastructure/persistence/drizzle-scenario.repository.js';
import { PostgresBrokerageRepository } from '../../src/modules/trading/infrastructure/persistence/postgres-brokerage.repository.js';

const POSTGRES_IMAGE =
  'postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94';

describe('simulator Drizzle migration', () => {
  let connectionString: string;
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>> | undefined;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase('financial_app')
      .withUsername('financial_migration')
      .withPassword('test-only-password')
      .start();
    connectionString = container.getConnectionUri();
    const adminClient = new Client({ connectionString });
    await adminClient.connect();
    try {
      await adminClient.query(`
        CREATE ROLE financial_simulator_app LOGIN PASSWORD 'example-simulator-test-only'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
        GRANT CONNECT ON DATABASE financial_app TO financial_simulator_app;
      `);
    } finally {
      await adminClient.end();
    }
    await migrateSimulatorDatabase(connectionString);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('uses the simulator-specific finapp migration history table', async () => {
    const client = new Client({ connectionString });
    await client.connect();

    try {
      const result = await client.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'finapp_meta'
        ORDER BY table_name
      `);

      expect(result.rows).toEqual([
        { table_name: 'finapp_simulator_drizzle_migrations' },
      ]);
    } finally {
      await client.end();
    }
  });

  it('creates only finapp-prefixed application objects', async () => {
    const client = new Client({ connectionString });
    await client.connect();

    try {
      const schemas = await client.query<{ schema_name: string }>(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'finapp\\_%' ESCAPE '\\'
        ORDER BY schema_name
      `);
      const invalidRelations = await client.query<{ object_name: string }>(`
        SELECT c.relname AS object_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname LIKE 'finapp\\_%' ESCAPE '\\'
          AND c.relkind IN ('r', 'i', 'S')
          AND c.relname NOT LIKE 'finapp\\_%' ESCAPE '\\'
      `);
      const invalidConstraints = await client.query<{ object_name: string }>(`
        SELECT con.conname AS object_name
        FROM pg_constraint con
        JOIN pg_namespace n ON n.oid = con.connamespace
        WHERE n.nspname LIKE 'finapp\\_%' ESCAPE '\\'
          AND con.conname NOT LIKE 'finapp\\_%' ESCAPE '\\'
      `);

      expect(schemas.rows.map(({ schema_name }) => schema_name)).toEqual([
        'finapp_meta',
        'finapp_simulator',
      ]);
      expect(invalidRelations.rows).toEqual([]);
      expect(invalidConstraints.rows).toEqual([]);
    } finally {
      await client.end();
    }
  });

  it('seeds the deterministic BALANCED_WORKER dataset idempotently', async () => {
    const simulatorUrl = new URL(connectionString);
    simulatorUrl.username = 'financial_simulator_app';
    simulatorUrl.password = 'example-simulator-test-only';
    const pool = new Pool({
      connectionString: simulatorUrl.toString(),
      max: 2,
    });
    const repository = new AccountRepository(pool);
    const scenario = new DrizzleScenarioRepository(pool);

    try {
      await repository.seedBalancedWorker();
      await repository.seedBalancedWorker();
      await scenario.seed();
      await scenario.seed();

      expect(await repository.accounts('SYNTH-CUSTOMER-A')).toEqual([
        {
          externalAccountId: 'SYNTH-ACCOUNT-A-001',
          maskedAccountNumber: 'SYNTH-****-0001',
          accountType: 'BROKERAGE',
          currency: 'KRW',
          cashBalance: '15400000.0000',
          status: 'ACTIVE',
        },
      ]);
      expect(await repository.holdings('SYNTH-CUSTOMER-A')).toHaveLength(1);
      expect(await repository.transactions('SYNTH-CUSTOMER-A')).toHaveLength(1);
      const counts = await pool.query<{
        accounts: string;
        customers: string;
        prices: string;
        scenarios: string;
      }>(`
        SELECT
          (SELECT count(*) FROM finapp_simulator.finapp_sim_customer)::text AS customers,
          (SELECT count(*) FROM finapp_simulator.finapp_sim_account)::text AS accounts,
          (SELECT count(*) FROM finapp_simulator.finapp_sim_market_price)::text AS prices,
          (SELECT count(*) FROM finapp_simulator.finapp_sim_scenario)::text AS scenarios
      `);
      expect(counts.rows[0]).toEqual({
        accounts: '1',
        customers: '1',
        prices: '1',
        scenarios: '1',
      });
    } finally {
      await pool.end();
    }
  });

  it('enforces brokerage idempotency and UNKNOWN then FILLED recovery', async () => {
    const simulatorUrl = new URL(connectionString);
    simulatorUrl.username = 'financial_simulator_app';
    simulatorUrl.password = 'example-simulator-test-only';
    const pool = new Pool({
      connectionString: simulatorUrl.toString(),
      max: 8,
    });
    const accounts = new AccountRepository(pool);
    const scenarios = new DrizzleScenarioRepository(pool);
    const brokerage = new PostgresBrokerageRepository(pool);
    const request = {
      clientOrderId: '92000000-0000-4000-8000-000000000001',
      accountId: 'SYNTH-ACCOUNT-A-001',
      instrumentId: 'SYNTH-EQUITY-001',
      side: 'BUY' as const,
      quantity: '3.00000000',
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');

    try {
      await accounts.seedBalancedWorker();
      await scenarios.seed();
      const repeated = await Promise.all(
        Array.from({ length: 10 }, () =>
          brokerage.submit(request, hash, 'NORMAL'),
        ),
      );
      expect(
        repeated.filter(
          (result) => result.kind === 'accepted' && result.created,
        ),
      ).toHaveLength(1);
      expect(repeated.every((result) => result.kind === 'accepted')).toBe(true);
      const conflict = await brokerage.submit(
        { ...request, quantity: '4.00000000' },
        createHash('sha256').update('different').digest('hex'),
        'NORMAL',
      );
      expect(conflict).toEqual({ kind: 'conflict' });

      const unknownRequest = {
        ...request,
        clientOrderId: '92000000-0000-4000-8000-000000000002',
      };
      const unknown = await brokerage.submit(
        unknownRequest,
        createHash('sha256')
          .update(JSON.stringify(unknownRequest))
          .digest('hex'),
        'ORDER_UNKNOWN_THEN_FILLED',
      );
      expect(unknown.kind === 'accepted' && unknown.order.status).toBe(
        'UNKNOWN',
      );
      await expect(
        brokerage.find(unknownRequest.clientOrderId),
      ).resolves.toMatchObject({
        status: 'FILLED',
        filledAmount: '375000.0000',
      });

      const orderCount = await pool.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM finapp_simulator.finapp_sim_order',
      );
      expect(orderCount.rows[0]?.count).toBe('2');
      await scenarios.reset();
      expect(await scenarios.current()).toBe('NORMAL');
      const resetCount = await pool.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM finapp_simulator.finapp_sim_order',
      );
      expect(resetCount.rows[0]?.count).toBe('0');
    } finally {
      await pool.end();
    }
  });
});
import { createHash } from 'node:crypto';
