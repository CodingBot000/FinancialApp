import { migratePlatformDatabase } from './migrate.js';

const connectionString = process.env.PLATFORM_MIGRATION_DATABASE_URL;

if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('PLATFORM_MIGRATION_DATABASE_URL is required.');
}

await migratePlatformDatabase(connectionString);
