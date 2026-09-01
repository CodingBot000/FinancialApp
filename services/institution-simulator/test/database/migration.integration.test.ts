import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migrateSimulatorDatabase } from '../../src/database/migrate.js';

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
});
