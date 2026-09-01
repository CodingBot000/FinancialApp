import { migrateSimulatorDatabase } from './migrate.js';

const connectionString = process.env.SIMULATOR_MIGRATION_DATABASE_URL;

if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('SIMULATOR_MIGRATION_DATABASE_URL is required.');
}

await migrateSimulatorDatabase(connectionString);
