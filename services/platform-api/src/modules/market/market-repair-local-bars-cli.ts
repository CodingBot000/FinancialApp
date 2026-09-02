import { Pool } from 'pg';

import { normalizeMarketBucketAt } from './domain/market-bucket.js';
import {
  MARKET_INTERVALS,
  type MarketInterval,
} from './domain/market-model.js';

const connectionString = process.env.PLATFORM_DATABASE_URL;
if (process.env.APP_ENV !== 'local') {
  throw new Error('Local market repair is available only when APP_ENV=local.');
}
if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('PLATFORM_DATABASE_URL is required.');
}
const databaseUrl = new URL(connectionString);
if (
  !['127.0.0.1', '::1', 'localhost', 'postgres'].includes(databaseUrl.hostname)
) {
  throw new Error('Local market repair refuses a non-local database host.');
}

const execute = process.argv.includes('--execute');
const pool = new Pool({ connectionString, max: 1 });
try {
  const result = await pool.query<{
    bucket_at: Date;
    id: string;
    instrument_id: string;
    interval: string;
  }>(`
    SELECT id, instrument_id, interval, bucket_at
    FROM finapp_market.finapp_market_price_bar
    WHERE source = 'LOCAL'
    ORDER BY bucket_at ASC, id ASC
  `);
  const newestByBucket = new Map<
    string,
    { bucketAt: string; id: string; originalBucketAt: string }
  >();
  const duplicateIds: string[] = [];
  for (const row of result.rows) {
    if (!MARKET_INTERVALS.includes(row.interval as MarketInterval)) continue;
    const interval = row.interval as MarketInterval;
    const bucketAt = normalizeMarketBucketAt(
      row.bucket_at.toISOString(),
      interval,
    );
    if (bucketAt === undefined) continue;
    const key = `${row.instrument_id}:${interval}:${bucketAt}`;
    const previous = newestByBucket.get(key);
    if (previous !== undefined) duplicateIds.push(previous.id);
    newestByBucket.set(key, {
      bucketAt,
      id: row.id,
      originalBucketAt: row.bucket_at.toISOString(),
    });
  }
  const normalizations = [...newestByBucket.values()].filter(
    (row) => row.originalBucketAt !== row.bucketAt,
  );

  if (execute && (duplicateIds.length > 0 || normalizations.length > 0)) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM finapp_market.finapp_market_price_bar
         WHERE source = 'LOCAL' AND id = ANY($1::uuid[])`,
        [duplicateIds],
      );
      for (const row of normalizations) {
        await client.query(
          `UPDATE finapp_market.finapp_market_price_bar
           SET bucket_at = $2
           WHERE source = 'LOCAL' AND id = $1`,
          [row.id, row.bucketAt],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      execute,
      scanned: result.rowCount ?? 0,
      duplicates: duplicateIds.length,
      normalizations: normalizations.length,
      remainingLogicalBuckets: newestByBucket.size,
    })}\n`,
  );
} finally {
  await pool.end();
}
