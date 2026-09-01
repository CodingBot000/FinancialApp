import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export const SIMULATOR_MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

export async function migrateSimulatorDatabase(
  connectionString: string,
  migrationsFolder = SIMULATOR_MIGRATIONS_FOLDER,
): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });

  try {
    await migrate(drizzle(pool), {
      migrationsFolder,
      migrationsSchema: 'finapp_meta',
      migrationsTable: 'finapp_simulator_drizzle_migrations',
    });
  } finally {
    await pool.end();
  }
}
