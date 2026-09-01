import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dbCredentials: {
    url:
      process.env.SIMULATOR_MIGRATION_DATABASE_URL ??
      'postgresql://financial_migration:example-local-only@localhost:5433/financial_app',
  },
  dialect: 'postgresql',
  migrations: {
    schema: 'finapp_meta',
    table: 'finapp_simulator_drizzle_migrations',
  },
  out: './drizzle',
  schema: './src/database/schema.ts',
  strict: true,
  verbose: true,
});
