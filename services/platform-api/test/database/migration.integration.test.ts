import { createHash } from 'node:crypto';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migratePlatformDatabase } from '../../src/database/migrate.js';
import { DrizzleIdentityRepository } from '../../src/modules/identity/infrastructure/persistence/drizzle-identity.repository.js';
import { SecurityEventService } from '../../src/modules/audit/security-event.service.js';
import { AesSensitiveDataAdapter } from '../../src/modules/mydata/infrastructure/crypto/aes-sensitive-data.adapter.js';
import { LocalDataKeyProvider } from '../../src/modules/mydata/infrastructure/crypto/local-data-key.provider.js';
import { MyDataConnectionConflictError } from '../../src/modules/mydata/domain/mydata-errors.js';
import { DrizzleMyDataRepository } from '../../src/modules/mydata/infrastructure/persistence/drizzle-mydata.repository.js';
import { runSimulation } from '../../src/modules/simulation/domain/simulation-engine.js';
import { SIMULATION_ENGINE_VERSION } from '../../src/modules/simulation/domain/simulation-model.js';
import { DrizzleSimulationRepository } from '../../src/modules/simulation/infrastructure/persistence/drizzle-simulation.repository.js';
import { DrizzleTradingRepository } from '../../src/modules/trading/infrastructure/persistence/drizzle-trading.repository.js';
import { DrizzleWealthRepository } from '../../src/modules/wealth/infrastructure/persistence/drizzle-wealth.repository.js';

const POSTGRES_IMAGE =
  'postgres:17.6-alpine@sha256:ef257d85f76e48da1c64832459b59fcaba1a4dac97bf5d7450c77753542eee94';

describe('platform Drizzle migration', () => {
  let connectionString: string;
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>> | undefined;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase('financial_app')
      .withUsername('finapp_admin')
      .withPassword('test-only-password')
      .start();
    connectionString = container.getConnectionUri();

    const adminClient = new Client({ connectionString });
    await adminClient.connect();

    try {
      await adminClient.query(`
        CREATE ROLE financial_platform_app LOGIN PASSWORD 'example-platform-test-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
        CREATE ROLE financial_simulator_app LOGIN PASSWORD 'example-simulator-test-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
        CREATE ROLE financial_migration LOGIN PASSWORD 'example-migration-test-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
        GRANT CONNECT ON DATABASE financial_app TO financial_platform_app, financial_simulator_app;
        GRANT CONNECT, CREATE ON DATABASE financial_app TO financial_migration;
        CREATE SCHEMA finapp_meta AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_identity AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_mydata AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_wealth AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_simulation AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_trading AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_audit AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_crypto AUTHORIZATION financial_migration;
        CREATE SCHEMA finapp_simulator AUTHORIZATION financial_migration;
        GRANT USAGE ON SCHEMA finapp_identity, finapp_mydata, finapp_wealth,
          finapp_simulation, finapp_trading, finapp_audit, finapp_crypto
          TO financial_platform_app;
        GRANT USAGE ON SCHEMA finapp_simulator TO financial_simulator_app;
      `);
    } finally {
      await adminClient.end();
    }

    const migrationUrl = new URL(connectionString);
    migrationUrl.username = 'financial_migration';
    migrationUrl.password = 'example-migration-test-only';
    await migratePlatformDatabase(migrationUrl.toString());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('uses the service-specific finapp migration history table', async () => {
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
        { table_name: 'finapp_platform_drizzle_migrations' },
      ]);
      const history = await client.query<{ count: string }>(`
        SELECT count(*)::text AS count
        FROM finapp_meta.finapp_platform_drizzle_migrations
      `);
      expect(history.rows[0]?.count).toBe('9');
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
        'finapp_audit',
        'finapp_crypto',
        'finapp_identity',
        'finapp_meta',
        'finapp_mydata',
        'finapp_simulation',
        'finapp_simulator',
        'finapp_trading',
        'finapp_wealth',
      ]);
      expect(invalidRelations.rows).toEqual([]);
      expect(invalidConstraints.rows).toEqual([]);
    } finally {
      await client.end();
    }
  });

  it('keeps platform and simulator runtime roles isolated', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const simulatorUrl = new URL(connectionString);
    simulatorUrl.username = 'financial_simulator_app';
    simulatorUrl.password = 'example-simulator-test-only';
    const platformClient = new Client({
      connectionString: platformUrl.toString(),
    });
    const simulatorClient = new Client({
      connectionString: simulatorUrl.toString(),
    });
    await platformClient.connect();
    await simulatorClient.connect();

    try {
      const platformPrivileges = await platformClient.query<{
        can_create: boolean;
        can_use_simulator: boolean;
      }>(`
        SELECT
          has_database_privilege(current_user, 'financial_app', 'CREATE') AS can_create,
          has_schema_privilege(current_user, 'finapp_simulator', 'USAGE') AS can_use_simulator
      `);
      const simulatorPrivileges = await simulatorClient.query<{
        can_create: boolean;
        can_use_platform: boolean;
      }>(`
        SELECT
          has_database_privilege(current_user, 'financial_app', 'CREATE') AS can_create,
          has_schema_privilege(current_user, 'finapp_wealth', 'USAGE') AS can_use_platform
      `);

      expect(platformPrivileges.rows[0]).toEqual({
        can_create: false,
        can_use_simulator: false,
      });
      expect(simulatorPrivileges.rows[0]).toEqual({
        can_create: false,
        can_use_platform: false,
      });
    } finally {
      await Promise.all([platformClient.end(), simulatorClient.end()]);
    }
  });

  it('records hashed append-only security events with allowlisted metadata', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const pool = new Pool({ connectionString: platformUrl.toString(), max: 2 });
    const service = new SecurityEventService(pool);
    const previousHashKey = process.env.FINAPP_SECURITY_EVENT_HASH_KEY_BASE64;
    process.env.FINAPP_SECURITY_EVENT_HASH_KEY_BASE64 = Buffer.alloc(
      32,
      5,
    ).toString('base64');

    try {
      await service.record({
        eventType: 'AUTHENTICATION_FAILURE',
        reasonCode: 'AUTH_TOKEN_INVALID',
        traceId: 'security-trace-1',
        sourceIp: '127.0.0.1',
        metadata: { requiredScopeCount: 0, syntheticData: true },
      });
      await expect(
        service.record({
          eventType: 'SUSPICIOUS_REQUEST',
          reasonCode: 'UNSAFE_METADATA',
          traceId: 'security-trace-2',
          metadata: { token: true } as never,
        }),
      ).rejects.toThrow('non-allowlisted');
      const result = await pool.query<{
        can_delete: boolean;
        can_update: boolean;
        metadata: Record<string, unknown>;
        reason_code: string;
        source_ip_hash: string;
      }>(`
        SELECT e.reason_code, e.source_ip_hash, e.metadata,
          has_table_privilege(current_user, 'finapp_audit.finapp_security_event', 'UPDATE') AS can_update,
          has_table_privilege(current_user, 'finapp_audit.finapp_security_event', 'DELETE') AS can_delete
        FROM finapp_audit.finapp_security_event e
        WHERE e.trace_id = 'security-trace-1'
      `);
      expect(result.rows[0]).toMatchObject({
        can_delete: false,
        can_update: false,
        metadata: { requiredScopeCount: 0, syntheticData: true },
        reason_code: 'AUTH_TOKEN_INVALID',
        source_ip_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
      expect(JSON.stringify(result.rows[0])).not.toContain('127.0.0.1');
    } finally {
      if (previousHashKey === undefined)
        delete process.env.FINAPP_SECURITY_EVENT_HASH_KEY_BASE64;
      else process.env.FINAPP_SECURITY_EVENT_HASH_KEY_BASE64 = previousHashKey;
      await pool.end();
    }
  });

  it('provisions one internal user for repeated OIDC subject requests', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const pool = new Pool({ connectionString: platformUrl.toString(), max: 2 });
    const repository = new DrizzleIdentityRepository(pool);

    try {
      const first = await repository.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'synthetic-user-a',
      );
      const second = await repository.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'synthetic-user-a',
      );
      const counts = await pool.query<{
        identities: string;
        profiles: string;
        users: string;
      }>(`
        SELECT
          (SELECT count(*) FROM finapp_identity.finapp_app_user)::text AS users,
          (SELECT count(*) FROM finapp_identity.finapp_oidc_identity)::text AS identities,
          (SELECT count(*) FROM finapp_identity.finapp_risk_profile)::text AS profiles
      `);

      expect(second).toEqual(first);
      expect(counts.rows[0]).toEqual({
        identities: '1',
        profiles: '1',
        users: '1',
      });
    } finally {
      await pool.end();
    }
  });

  it('keeps raw immutable and deduplicates normalized data across repeated syncs', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const pool = new Pool({ connectionString: platformUrl.toString(), max: 3 });
    const identity = new DrizzleIdentityRepository(pool);
    const repository = new DrizzleMyDataRepository(pool);
    const wealth = new DrizzleWealthRepository(pool);
    const cipher = new AesSensitiveDataAdapter(new LocalDataKeyProvider());
    const previousKey = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64;
    const previousVersion = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION;
    process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64 = Buffer.alloc(
      32,
      7,
    ).toString('base64');
    process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION = 'test-v1';

    try {
      const user = await identity.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'sync-user-a',
      );
      const encrypted = await cipher.encrypt('SYNTH-CUSTOMER-A', user.userId);
      expect(encrypted.ciphertext.toString('utf8')).not.toContain(
        'SYNTH-CUSTOMER-A',
      );
      expect(encrypted.ciphertext.subarray(0, 4).toString('ascii')).toBe(
        'FAE2',
      );
      const connection = await repository.createConnection({
        userId: user.userId,
        institutionCode: 'SYNTH_WEALTH_001',
        externalCustomerIdHash: await cipher.lookupHash(
          'SYNTH-CUSTOMER-A',
          user.userId,
        ),
        externalCustomerIdCiphertext: encrypted.ciphertext,
        encryptionKeyVersion: encrypted.keyVersion,
        maskedExternalCustomerId: 'SYNTH-****-A',
        consentExpiresAt: new Date('2027-09-01T00:00:00.000Z'),
      });
      await expect(
        repository.createConnection({
          userId: user.userId,
          institutionCode: 'SYNTH_WEALTH_001',
          externalCustomerIdHash: await cipher.lookupHash(
            'SYNTH-CUSTOMER-A',
            user.userId,
          ),
          externalCustomerIdCiphertext: encrypted.ciphertext,
          encryptionKeyVersion: encrypted.keyVersion,
          maskedExternalCustomerId: 'SYNTH-****-A',
          consentExpiresAt: new Date('2027-09-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(MyDataConnectionConflictError);
      const dataset = {
        accounts: {
          schemaVersion: 'simulator-v1' as const,
          items: [
            {
              externalAccountId: 'SYNTH-ACCOUNT-A-001',
              maskedAccountNumber: 'SYNTH-****-0001',
              accountType: 'BROKERAGE',
              currency: 'KRW',
              cashBalance: '15400000.0000',
              status: 'ACTIVE',
            },
          ],
          nextCursor: null,
          requestId: 'request-accounts',
        },
        holdings: {
          schemaVersion: 'simulator-v1' as const,
          items: [
            {
              externalAccountId: 'SYNTH-ACCOUNT-A-001',
              externalHoldingId: 'SYNTH-HOLDING-A-001',
              instrumentCode: 'SYNTH-EQUITY-001',
              displayName: '가상 성장형 펀드',
              assetClass: 'EQUITY',
              quantity: '1360.00000000',
              averagePrice: '125000.0000',
              asOfAt: '2026-09-01T00:00:00.000Z',
            },
          ],
          nextCursor: null,
          requestId: 'request-holdings',
        },
        transactions: {
          schemaVersion: 'simulator-v1' as const,
          items: [
            {
              externalAccountId: 'SYNTH-ACCOUNT-A-001',
              externalTransactionId: 'SYNTH-TX-A-001',
              transactionType: 'DEPOSIT',
              amount: '1500000.0000',
              currency: 'KRW',
              occurredAt: '2026-08-25T00:00:00.000Z',
            },
          ],
          nextCursor: null,
          requestId: 'request-transactions',
        },
      };

      for (let iteration = 0; iteration < 2; iteration += 1) {
        const created = await repository.createSync(
          user.userId,
          connection.connectionId,
        );
        expect(created.created).toBe(true);
        if (iteration === 0) {
          const duplicateActive = await repository.createSync(
            user.userId,
            connection.connectionId,
          );
          expect(duplicateActive).toMatchObject({
            created: false,
            sync: { syncId: created.sync.syncId, status: 'QUEUED' },
          });
        }
        const claimed = await repository.beginSync(created.sync.syncId);
        expect(
          await cipher.decrypt(
            claimed?.ciphertext ?? Buffer.alloc(0),
            claimed?.encryptionKeyVersion ?? '',
            user.userId,
          ),
        ).toBe('SYNTH-CUSTOMER-A');
        await repository.completeSync(created.sync.syncId, dataset);
        const completed = await repository.getSync(
          user.userId,
          created.sync.syncId,
        );
        expect(completed).toMatchObject({
          status: 'COMPLETED',
          counts: {
            rawRecords: 3,
            accounts: 1,
            holdings: 1,
            transactions: 1,
          },
        });
      }

      const retrying = await repository.createSync(
        user.userId,
        connection.connectionId,
      );
      expect(await repository.beginSync(retrying.sync.syncId)).toBeDefined();
      expect(
        await repository.rescheduleOrFailSync(
          retrying.sync.syncId,
          'MYDATA_INSTITUTION_SYNC_FAILED',
          2,
          new Date('2020-01-01T00:00:00.000Z'),
        ),
      ).toBe('QUEUED');
      expect(await repository.listDueSyncIds(new Date(), 10)).toContain(
        retrying.sync.syncId,
      );
      expect(await repository.beginSync(retrying.sync.syncId)).toBeDefined();
      expect(
        await repository.rescheduleOrFailSync(
          retrying.sync.syncId,
          'MYDATA_INSTITUTION_SYNC_FAILED',
          2,
          new Date('2020-01-01T00:00:00.000Z'),
        ),
      ).toBe('FAILED');

      const stale = await repository.createSync(
        user.userId,
        connection.connectionId,
      );
      expect(await repository.beginSync(stale.sync.syncId)).toBeDefined();
      expect(
        await repository.recoverStaleSyncs(
          new Date(Date.now() + 1000),
          3,
          new Date('2020-01-01T00:00:00.000Z'),
        ),
      ).toBe(1);
      expect(await repository.beginSync(stale.sync.syncId)).toBeDefined();
      await repository.rescheduleOrFailSync(
        stale.sync.syncId,
        'MYDATA_SYNC_LEASE_EXPIRED',
        1,
        new Date('2020-01-01T00:00:00.000Z'),
      );
      expect(
        await repository.listDueConnections(
          new Date(Date.now() + 1000),
          new Date(),
          10,
        ),
      ).toContainEqual({
        connectionId: connection.connectionId,
        userId: user.userId,
      });

      const contested = await repository.createSync(
        user.userId,
        connection.connectionId,
      );
      const claims = await Promise.all([
        repository.beginSync(contested.sync.syncId),
        repository.beginSync(contested.sync.syncId),
      ]);
      expect(claims.filter((claim) => claim !== undefined)).toHaveLength(1);
      await repository.rescheduleOrFailSync(
        contested.sync.syncId,
        'MYDATA_TEST_COMPLETE',
        1,
        new Date('2020-01-01T00:00:00.000Z'),
      );

      const summary = await wealth.summary(user.userId);
      expect(summary).toMatchObject({
        asOfDate: '2026-09-01',
        totalAssets: '185400000.0000',
        cash: '15400000.0000',
        investments: '170000000.0000',
      });
      expect(await wealth.accounts(user.userId)).toHaveLength(1);
      expect(await wealth.holdings(user.userId)).toMatchObject([
        {
          holdingId: expect.any(String),
          instrumentId: expect.any(String),
          instrumentCode: 'SYNTH-EQUITY-001',
        },
      ]);
      expect(await wealth.transactions(user.userId)).toHaveLength(1);
      expect(await wealth.history(user.userId, 'ALL')).toHaveLength(1);

      const counts = await pool.query<{
        derived_transactions: string;
        raw: string;
      }>(`
        SELECT
          (SELECT count(*) FROM finapp_mydata.finapp_raw_record)::text AS raw,
          (SELECT count(*) FROM finapp_wealth.finapp_financial_transaction)::text AS derived_transactions
      `);
      expect(counts.rows[0]).toEqual({
        derived_transactions: '1',
        raw: '6',
      });
      const immutablePrivileges = await pool.query<{
        can_delete: boolean;
        can_update: boolean;
      }>(`
        SELECT
          has_table_privilege(current_user, 'finapp_mydata.finapp_raw_record', 'UPDATE') AS can_update,
          has_table_privilege(current_user, 'finapp_mydata.finapp_raw_record', 'DELETE') AS can_delete
      `);
      expect(immutablePrivileges.rows[0]).toEqual({
        can_delete: false,
        can_update: false,
      });
      await expect(
        pool.query(`
          UPDATE finapp_mydata.finapp_raw_record
          SET payload = '{}'::jsonb
        `),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      if (previousKey === undefined) {
        delete process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64;
      } else {
        process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64 = previousKey;
      }
      if (previousVersion === undefined) {
        delete process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION;
      } else {
        process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION = previousVersion;
      }
      await pool.end();
    }
  });

  it('persists immutable deterministic simulation results with ownership', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const pool = new Pool({ connectionString: platformUrl.toString(), max: 2 });
    const identity = new DrizzleIdentityRepository(pool);
    const repository = new DrizzleSimulationRepository(pool);

    try {
      const owner = await identity.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'simulation-owner',
      );
      const other = await identity.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'simulation-other',
      );
      const assumption = await repository.activeAssumption();
      expect(assumption.version).toBe('SYNTHETIC_V1');
      const snapshot = {
        initialAssets: '185400000.0000',
        monthlyContribution: '1500000.0000',
        durationMonths: 12,
        targetAmount: '220000000.0000',
        allocation: [
          { assetClass: 'CASH' as const, weight: 0.1 },
          { assetClass: 'BOND' as const, weight: 0.3 },
          { assetClass: 'EQUITY' as const, weight: 0.6 },
        ],
      };
      const result = runSimulation(
        {
          initialAssets: Number(snapshot.initialAssets),
          monthlyContribution: Number(snapshot.monthlyContribution),
          durationMonths: snapshot.durationMonths,
          targetAmount: Number(snapshot.targetAmount),
          allocation: snapshot.allocation,
        },
        assumption,
        999n,
        100,
      );
      const saved = await repository.save({
        userId: owner.userId,
        assumption,
        input: snapshot,
        seed: 999n,
        pathCount: 100,
        engineVersion: SIMULATION_ENGINE_VERSION,
        result,
      });

      expect(saved.series).toHaveLength(13);
      expect(
        saved.series.every(
          (point) =>
            Number(point.p10) <= Number(point.p50) &&
            Number(point.p50) <= Number(point.p90),
        ),
      ).toBe(true);
      expect(
        await repository.findByUser(owner.userId, saved.simulationId),
      ).toEqual(saved);
      expect(
        await repository.findByUser(other.userId, saved.simulationId),
      ).toBeUndefined();
      const privileges = await pool.query<{
        can_delete: boolean;
        can_update: boolean;
      }>(`
        SELECT
          has_table_privilege(current_user, 'finapp_simulation.finapp_simulation_run', 'UPDATE') AS can_update,
          has_table_privilege(current_user, 'finapp_simulation.finapp_simulation_run', 'DELETE') AS can_delete
      `);
      expect(privileges.rows[0]).toEqual({
        can_delete: false,
        can_update: false,
      });
    } finally {
      await pool.end();
    }
  });

  it('persists an immutable owner-scoped quote with exact decimal calculation', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const pool = new Pool({ connectionString: platformUrl.toString(), max: 2 });
    const identity = new DrizzleIdentityRepository(pool);
    const repository = new DrizzleTradingRepository(pool);

    try {
      const owner = await identity.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'sync-user-a',
      );
      const resources = await pool.query<{
        account_id: string;
        instrument_id: string;
      }>(
        `
        SELECT a.id AS account_id, i.id AS instrument_id
        FROM finapp_wealth.finapp_financial_account a
        JOIN finapp_wealth.finapp_holding h ON h.account_id = a.id
        JOIN finapp_wealth.finapp_instrument i ON i.id = h.instrument_id
        WHERE a.user_id = $1
        LIMIT 1
      `,
        [owner.userId],
      );
      const resource = resources.rows[0];
      expect(resource).toBeDefined();
      const quote = await repository.createQuote(
        owner.userId,
        {
          accountId: resource?.account_id ?? '',
          instrumentId: resource?.instrument_id ?? '',
          side: 'BUY',
          quantity: '3.00000000',
        },
        '125000.0000',
      );

      expect(quote).toMatchObject({
        side: 'BUY',
        quantity: '3.00000000',
        unitPrice: '125000.0000',
        estimatedAmount: '375000.0000',
        fee: '0.0000',
        currency: 'KRW',
        syntheticQuote: true,
      });
      expect(
        await repository.createQuote(
          '00000000-0000-4000-8000-000000000099',
          {
            accountId: resource?.account_id ?? '',
            instrumentId: resource?.instrument_id ?? '',
            side: 'BUY',
            quantity: '1.00000000',
          },
          '125000.0000',
        ),
      ).toBeUndefined();
      const privileges = await pool.query<{
        can_delete: boolean;
        can_update: boolean;
      }>(`
        SELECT
          has_table_privilege(current_user, 'finapp_trading.finapp_quote', 'UPDATE') AS can_update,
          has_table_privilege(current_user, 'finapp_trading.finapp_quote', 'DELETE') AS can_delete
      `);
      expect(privileges.rows[0]).toEqual({
        can_delete: false,
        can_update: false,
      });

      const concurrentQuote = await repository.createQuote(
        owner.userId,
        {
          accountId: resource?.account_id ?? '',
          instrumentId: resource?.instrument_id ?? '',
          side: 'BUY',
          quantity: '1.00000000',
        },
        '125000.0000',
      );
      expect(concurrentQuote).toBeDefined();
      const concurrentRequest = {
        quoteId: concurrentQuote?.quoteId ?? '',
        accountId: resource?.account_id ?? '',
        instrumentId: resource?.instrument_id ?? '',
        side: 'BUY' as const,
        quantity: '1.00000000',
      };
      const concurrentHash = createHash('sha256')
        .update(JSON.stringify(concurrentRequest))
        .digest('hex');
      const concurrentResults = await Promise.all(
        Array.from({ length: 20 }, () =>
          repository.prepareOrder(
            owner.userId,
            '80000000-0000-4000-8000-000000000000',
            concurrentHash,
            concurrentRequest,
          ),
        ),
      );
      expect(
        concurrentResults.filter(
          (item) => item.kind === 'prepared' && item.value.created,
        ),
      ).toHaveLength(1);
      expect(concurrentResults.every((item) => item.kind === 'prepared')).toBe(
        true,
      );

      const largeQuotes = await Promise.all([
        repository.createQuote(
          owner.userId,
          {
            accountId: resource?.account_id ?? '',
            instrumentId: resource?.instrument_id ?? '',
            side: 'BUY',
            quantity: '64.00000000',
          },
          '125000.0000',
        ),
        repository.createQuote(
          owner.userId,
          {
            accountId: resource?.account_id ?? '',
            instrumentId: resource?.instrument_id ?? '',
            side: 'BUY',
            quantity: '64.00000000',
          },
          '125000.0000',
        ),
      ]);
      expect(largeQuotes.every((item) => item !== undefined)).toBe(true);
      const requests = largeQuotes.map((item) => ({
        quoteId: item?.quoteId ?? '',
        accountId: resource?.account_id ?? '',
        instrumentId: resource?.instrument_id ?? '',
        side: 'BUY' as const,
        quantity: '64.00000000',
      }));
      const hashes = requests.map((request) =>
        createHash('sha256').update(JSON.stringify(request)).digest('hex'),
      );
      const prepared = await Promise.all([
        repository.prepareOrder(
          owner.userId,
          '80000000-0000-4000-8000-000000000001',
          hashes[0] ?? '',
          requests[0]!,
        ),
        repository.prepareOrder(
          owner.userId,
          '80000000-0000-4000-8000-000000000002',
          hashes[1] ?? '',
          requests[1]!,
        ),
      ]);
      expect(prepared.map((item) => item.kind).sort()).toEqual([
        'insufficient_funds',
        'prepared',
      ]);
      const winnerIndex = prepared.findIndex(
        (item) => item.kind === 'prepared',
      );
      const winnerRequest = requests[winnerIndex]!;
      const winnerHash = hashes[winnerIndex] ?? '';
      const winnerKey = `80000000-0000-4000-8000-00000000000${winnerIndex + 1}`;
      const replays = await Promise.all(
        Array.from({ length: 20 }, () =>
          repository.prepareOrder(
            owner.userId,
            winnerKey,
            winnerHash,
            winnerRequest,
          ),
        ),
      );
      expect(
        replays.every(
          (item) => item.kind === 'prepared' && item.value.created === false,
        ),
      ).toBe(true);
      expect(
        await repository.prepareOrder(
          owner.userId,
          winnerKey,
          'f'.repeat(64),
          winnerRequest,
        ),
      ).toEqual({ kind: 'idempotency_conflict' });
      const invariants = await pool.query<{
        available: string;
        idempotency_records: string;
        orders: string;
        reservations: string;
        reserved: string;
      }>(
        `
        SELECT
          c.available_balance::text AS available,
          c.reserved_balance::text AS reserved,
          (SELECT count(*) FROM finapp_trading.finapp_trade_order)::text AS orders,
          (SELECT count(*) FROM finapp_trading.finapp_fund_reservation)::text AS reservations,
          (SELECT count(*) FROM finapp_trading.finapp_idempotency_record)::text AS idempotency_records
        FROM finapp_wealth.finapp_cash_account c
        WHERE c.account_id = $1
      `,
        [resource?.account_id],
      );
      expect(invariants.rows[0]).toEqual({
        available: '7275000.0000',
        reserved: '8125000.0000',
        orders: '2',
        reservations: '2',
        idempotency_records: '2',
      });
    } finally {
      await pool.end();
    }
  });

  it('settles, releases, reconciles, and audits orders exactly once', async () => {
    const platformUrl = new URL(connectionString);
    platformUrl.username = 'financial_platform_app';
    platformUrl.password = 'example-platform-test-only';
    const pool = new Pool({ connectionString: platformUrl.toString(), max: 8 });
    const identity = new DrizzleIdentityRepository(pool);
    const repository = new DrizzleTradingRepository(pool);

    try {
      const owner = await identity.provisionFromOidc(
        'https://issuer.example/realms/finapp',
        'sync-user-a',
      );
      const resources = await pool.query<{
        account_id: string;
        instrument_id: string;
      }>(
        `
        SELECT a.id AS account_id, i.id AS instrument_id
        FROM finapp_wealth.finapp_financial_account a
        JOIN finapp_wealth.finapp_holding h ON h.account_id = a.id
        JOIN finapp_wealth.finapp_instrument i ON i.id = h.instrument_id
        WHERE a.user_id = $1 LIMIT 1
      `,
        [owner.userId],
      );
      const resource = resources.rows[0]!;
      const before = await pool.query<{ total: string }>(
        `SELECT (available_balance + reserved_balance)::text AS total
         FROM finapp_wealth.finapp_cash_account WHERE account_id = $1`,
        [resource.account_id],
      );

      let sequence = 10;
      const prepare = async (quantity: string) => {
        const quote = await repository.createQuote(
          owner.userId,
          {
            accountId: resource.account_id,
            instrumentId: resource.instrument_id,
            side: 'BUY',
            quantity,
          },
          '125000.0000',
        );
        expect(quote).toBeDefined();
        const request = {
          quoteId: quote!.quoteId,
          accountId: resource.account_id,
          instrumentId: resource.instrument_id,
          side: 'BUY' as const,
          quantity,
        };
        const hash = createHash('sha256')
          .update(JSON.stringify(request))
          .digest('hex');
        const key = `81000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
        sequence += 1;
        const prepared = await repository.prepareOrder(
          owner.userId,
          key,
          hash,
          request,
          `trace-${key}`,
        );
        expect(prepared.kind).toBe('prepared');
        if (prepared.kind !== 'prepared') throw new Error('not prepared');
        return prepared.value.order;
      };

      const filled = await prepare('1.00000000');
      await expect(
        repository.applyExternalResult(
          filled.orderId,
          {
            clientOrderId: filled.orderId,
            externalOrderId: `SIM-${filled.orderId}`,
            status: 'FILLED',
            quantity: '1.00000000',
            unitPrice: '125000.0000',
            filledAmount: '125000.0000',
            executedAt: '2026-09-02T00:00:00.000Z',
          },
          'SUBMISSION',
          'trace-filled',
        ),
      ).resolves.toMatchObject({
        status: 'FILLED',
        filledAmount: '125000.0000',
      });

      const rejected = await prepare('1.00000000');
      await expect(
        repository.applyExternalResult(
          rejected.orderId,
          {
            clientOrderId: rejected.orderId,
            externalOrderId: `SIM-${rejected.orderId}`,
            status: 'REJECTED',
            quantity: '1.00000000',
            unitPrice: null,
            filledAmount: null,
            executedAt: null,
          },
          'SUBMISSION',
          'trace-rejected',
        ),
      ).resolves.toMatchObject({ status: 'REJECTED', filledAmount: null });

      const unknown = await prepare('2.00000000');
      await repository.markUnknown(
        unknown.orderId,
        'BROKERAGE_TIMEOUT',
        'trace-unknown',
      );
      const claimResults = await Promise.all([
        repository.claimReconciliation('worker-a', new Date(), new Date(0)),
        repository.claimReconciliation('worker-b', new Date(), new Date(0)),
      ]);
      expect(claimResults.filter(Boolean)).toHaveLength(1);
      const claim = claimResults.find(Boolean)!;
      await repository.applyExternalResult(
        unknown.orderId,
        {
          clientOrderId: unknown.orderId,
          externalOrderId: `SIM-${unknown.orderId}`,
          status: 'FILLED',
          quantity: '2.00000000',
          unitPrice: '125000.0000',
          filledAmount: '250000.0000',
          executedAt: '2026-09-02T00:01:00.000Z',
        },
        'RECONCILIATION',
        `reconciliation:${claim.jobId}`,
        claim.jobId,
      );
      await repository.applyExternalResult(
        unknown.orderId,
        {
          clientOrderId: unknown.orderId,
          externalOrderId: `SIM-${unknown.orderId}`,
          status: 'FILLED',
          quantity: '2.00000000',
          unitPrice: '125000.0000',
          filledAmount: '250000.0000',
          executedAt: '2026-09-02T00:01:00.000Z',
        },
        'RECONCILIATION',
        `reconciliation:${claim.jobId}`,
        claim.jobId,
      );

      const failed = await prepare('1.00000000');
      await repository.markUnknown(
        failed.orderId,
        'BROKERAGE_TIMEOUT',
        'trace-failed',
      );
      const failedClaim = await repository.claimReconciliation(
        'worker-c',
        new Date(),
        new Date(0),
      );
      expect(failedClaim?.orderId).toBe(failed.orderId);
      await repository.rescheduleReconciliation(
        failedClaim!,
        'BROKERAGE_HTTP_ERROR',
        new Date(),
        1,
      );

      const pagedOrderIds = [
        filled.orderId,
        rejected.orderId,
        unknown.orderId,
        failed.orderId,
      ];
      await pool.query(
        `UPDATE finapp_trading.finapp_trade_order
         SET created_at = '2030-01-01T00:00:00.000Z'
         WHERE id = ANY($1::uuid[])`,
        [pagedOrderIds],
      );
      const firstPage = await repository.listOrders(owner.userId, undefined, 2);
      const secondPage = await repository.listOrders(
        owner.userId,
        firstPage.nextCursor ?? undefined,
        2,
      );
      expect(firstPage.nextCursor).not.toBeNull();
      expect(
        [...firstPage.items, ...secondPage.items]
          .map((order) => order.orderId)
          .sort(),
      ).toEqual(pagedOrderIds.sort());

      const after = await pool.query<{
        available: string;
        reserved: string;
        total: string;
      }>(
        `SELECT available_balance::text AS available,
                reserved_balance::text AS reserved,
                (available_balance + reserved_balance)::text AS total
         FROM finapp_wealth.finapp_cash_account WHERE account_id = $1`,
        [resource.account_id],
      );
      expect(Number(before.rows[0]?.total) - Number(after.rows[0]?.total)).toBe(
        375000,
      );
      const invariants = await pool.query<{
        audit_actions: string;
        executions: string;
        failed_status: string;
        ledger_entries: string;
        position_quantity: string;
        reconciliation_completed: string;
      }>(
        `
        SELECT
          (SELECT count(*) FROM finapp_trading.finapp_order_execution
           WHERE order_id IN ($1,$2,$3,$4))::text AS executions,
          (SELECT count(*) FROM finapp_trading.finapp_cash_ledger_entry
           WHERE order_id IN ($1,$2,$3,$4))::text AS ledger_entries,
          (SELECT quantity::text FROM finapp_trading.finapp_position
           WHERE account_id = $5 AND instrument_id = $6) AS position_quantity,
          (SELECT status FROM finapp_trading.finapp_trade_order WHERE id = $4) AS failed_status,
          (SELECT count(*) FROM finapp_trading.finapp_reconciliation_job
           WHERE order_id = $3 AND status = 'COMPLETED')::text AS reconciliation_completed,
          (SELECT count(*) FROM finapp_audit.finapp_audit_event
           WHERE resource_id IN ($1,$2,$3,$4))::text AS audit_actions
      `,
        [
          filled.orderId,
          rejected.orderId,
          unknown.orderId,
          failed.orderId,
          resource.account_id,
          resource.instrument_id,
        ],
      );
      expect(invariants.rows[0]).toEqual({
        audit_actions: '13',
        executions: '2',
        failed_status: 'FAILED',
        ledger_entries: '8',
        position_quantity: '3.00000000',
        reconciliation_completed: '1',
      });
      const outboxBeforePublish = await pool.query<{
        count: string;
        redacted: boolean;
      }>(
        `
        SELECT count(*)::text AS count,
               bool_and(payload ? 'outcome' AND payload ? 'syntheticData'
                 AND payload - 'outcome' - 'syntheticData' = '{}'::jsonb) AS redacted
        FROM finapp_trading.finapp_outbox_event
        WHERE aggregate_id = ANY($1::uuid[])
      `,
        [pagedOrderIds],
      );
      expect(outboxBeforePublish.rows[0]).toEqual({
        count: '4',
        redacted: true,
      });

      const simultaneousClaims = await Promise.all([
        repository.claimOutbox('outbox-worker-a', new Date(), new Date(0)),
        repository.claimOutbox('outbox-worker-b', new Date(), new Date(0)),
      ]);
      expect(simultaneousClaims.every(Boolean)).toBe(true);
      expect(
        new Set(simultaneousClaims.map((item) => item?.eventId)).size,
      ).toBe(2);
      const crashWindowClaim = simultaneousClaims[0]!;
      const completedClaim = simultaneousClaims[1]!;
      await expect(
        repository.recordOutboxDelivery(
          crashWindowClaim,
          'finapp-local-settlement-v1',
        ),
      ).resolves.toBe('DELIVERED');
      await repository.recordOutboxDelivery(
        completedClaim,
        'finapp-local-settlement-v1',
      );
      await repository.completeOutbox(completedClaim, new Date());

      await pool.query(
        `UPDATE finapp_trading.finapp_outbox_event
         SET locked_at = '2000-01-01T00:00:00.000Z'
         WHERE id = $1`,
        [crashWindowClaim.eventId],
      );
      const reclaimed = await repository.claimOutbox(
        'outbox-worker-c',
        new Date(),
        new Date(),
      );
      expect(reclaimed?.eventId).toBe(crashWindowClaim.eventId);
      await expect(
        repository.recordOutboxDelivery(
          reclaimed!,
          'finapp-local-settlement-v1',
        ),
      ).resolves.toBe('DUPLICATE');
      await repository.completeOutbox(reclaimed!, new Date());

      for (;;) {
        const next = await repository.claimOutbox(
          'outbox-worker-d',
          new Date(),
          new Date(0),
        );
        if (next === undefined) break;
        await repository.recordOutboxDelivery(
          next,
          'finapp-local-settlement-v1',
        );
        await repository.completeOutbox(next, new Date());
      }
      const outboxAfterPublish = await pool.query<{
        deliveries: string;
        processed: string;
      }>(
        `
        SELECT
          (SELECT count(*) FROM finapp_trading.finapp_outbox_delivery d
           JOIN finapp_trading.finapp_outbox_event e ON e.id = d.event_id
           WHERE e.aggregate_id = ANY($1::uuid[]))::text AS deliveries,
          (SELECT count(*) FROM finapp_trading.finapp_outbox_event
           WHERE aggregate_id = ANY($1::uuid[]) AND status = 'PROCESSED')::text AS processed
      `,
        [pagedOrderIds],
      );
      expect(outboxAfterPublish.rows[0]).toEqual({
        deliveries: '4',
        processed: '4',
      });
      const privileges = await pool.query<{
        audit_delete: boolean;
        audit_update: boolean;
        ledger_delete: boolean;
        ledger_update: boolean;
        outbox_delivery_delete: boolean;
        outbox_delivery_update: boolean;
        outbox_event_delete: boolean;
      }>(`
        SELECT
          has_table_privilege(current_user, 'finapp_audit.finapp_audit_event', 'UPDATE') AS audit_update,
          has_table_privilege(current_user, 'finapp_audit.finapp_audit_event', 'DELETE') AS audit_delete,
          has_table_privilege(current_user, 'finapp_trading.finapp_cash_ledger_entry', 'UPDATE') AS ledger_update,
          has_table_privilege(current_user, 'finapp_trading.finapp_cash_ledger_entry', 'DELETE') AS ledger_delete,
          has_table_privilege(current_user, 'finapp_trading.finapp_outbox_event', 'DELETE') AS outbox_event_delete,
          has_table_privilege(current_user, 'finapp_trading.finapp_outbox_delivery', 'UPDATE') AS outbox_delivery_update,
          has_table_privilege(current_user, 'finapp_trading.finapp_outbox_delivery', 'DELETE') AS outbox_delivery_delete
      `);
      expect(privileges.rows[0]).toEqual({
        audit_delete: false,
        audit_update: false,
        ledger_delete: false,
        ledger_update: false,
        outbox_delivery_delete: false,
        outbox_delivery_update: false,
        outbox_event_delete: false,
      });
    } finally {
      await pool.end();
    }
  });
});
