import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migrateSimulatorDatabase } from '../../src/database/migrate.js';
import { AccountRepository } from '../../src/modules/account/account.repository.js';

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

    try {
      await repository.seedBalancedWorker();
      await repository.seedBalancedWorker();

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
      const counts = await pool.query<{ accounts: string; customers: string }>(`
        SELECT
          (SELECT count(*) FROM finapp_simulator.finapp_sim_customer)::text AS customers,
          (SELECT count(*) FROM finapp_simulator.finapp_sim_account)::text AS accounts
      `);
      expect(counts.rows[0]).toEqual({ accounts: '1', customers: '1' });
    } finally {
      await pool.end();
    }
  });
});
