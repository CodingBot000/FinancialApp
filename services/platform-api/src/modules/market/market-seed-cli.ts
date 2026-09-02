import { Pool } from 'pg';

import { LocalMarketDataAdapter } from './infrastructure/http/local-market-data.adapter.js';
import { DrizzleMarketRepository } from './infrastructure/persistence/drizzle-market.repository.js';

const connectionString = process.env.PLATFORM_DATABASE_URL;
if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('PLATFORM_DATABASE_URL is required.');
}

const pool = new Pool({ connectionString, max: 2 });
try {
  const count = await new DrizzleMarketRepository(pool).upsertInstruments(
    await new LocalMarketDataAdapter().syncInstruments(),
  );
  process.stdout.write(`${JSON.stringify({ seeded: count })}\n`);
} finally {
  await pool.end();
}
