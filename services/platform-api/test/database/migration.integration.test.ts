import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client, Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migratePlatformDatabase } from '../../src/database/migrate.js';
import { DrizzleIdentityRepository } from '../../src/modules/identity/infrastructure/persistence/drizzle-identity.repository.js';
import { AesSensitiveDataAdapter } from '../../src/modules/mydata/infrastructure/crypto/aes-sensitive-data.adapter.js';
import { DrizzleMyDataRepository } from '../../src/modules/mydata/infrastructure/persistence/drizzle-mydata.repository.js';
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
      expect(history.rows[0]?.count).toBe('3');
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
    const cipher = new AesSensitiveDataAdapter();
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
      const encrypted = cipher.encrypt('SYNTH-CUSTOMER-A');
      expect(encrypted.ciphertext.toString('utf8')).not.toContain(
        'SYNTH-CUSTOMER-A',
      );
      const connection = await repository.createConnection({
        userId: user.userId,
        institutionCode: 'SYNTH_WEALTH_001',
        externalCustomerIdHash: cipher.lookupHash('SYNTH-CUSTOMER-A'),
        externalCustomerIdCiphertext: encrypted.ciphertext,
        encryptionKeyVersion: encrypted.keyVersion,
        maskedExternalCustomerId: 'SYNTH-****-A',
        consentExpiresAt: new Date('2027-09-01T00:00:00.000Z'),
      });
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
          cipher.decrypt(
            claimed?.ciphertext ?? Buffer.alloc(0),
            claimed?.encryptionKeyVersion ?? '',
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

      const summary = await wealth.summary(user.userId);
      expect(summary).toMatchObject({
        asOfDate: '2026-09-01',
        totalAssets: '185400000.0000',
        cash: '15400000.0000',
        investments: '170000000.0000',
      });
      expect(await wealth.accounts(user.userId)).toHaveLength(1);
      expect(await wealth.holdings(user.userId)).toHaveLength(1);
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
});
