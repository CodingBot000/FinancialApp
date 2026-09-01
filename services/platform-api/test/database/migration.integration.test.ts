import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migratePlatformDatabase } from '../../src/database/migrate.js';

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
});
