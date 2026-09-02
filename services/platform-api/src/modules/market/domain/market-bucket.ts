import type { MarketBar, MarketInterval } from './market-model.js';

const MINUTE_MS = 60_000;

export function normalizeMarketBucketAt(
  value: string,
  interval: MarketInterval,
): string | undefined {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  if (interval === 'MINUTE') {
    return new Date(
      Math.floor(timestamp / MINUTE_MS) * MINUTE_MS,
    ).toISOString();
  }

  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (interval === 'DAILY') {
    return new Date(Date.UTC(year, month, day)).toISOString();
  }
  if (interval === 'WEEKLY') {
    const dayOfWeek = date.getUTCDay();
    const distanceFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return new Date(
      Date.UTC(year, month, day - distanceFromMonday),
    ).toISOString();
  }
  if (interval === 'MONTHLY') {
    return new Date(Date.UTC(year, month, 1)).toISOString();
  }
  return new Date(Date.UTC(year, 0, 1)).toISOString();
}

export function deduplicateMarketBars(
  bars: readonly MarketBar[],
  interval: MarketInterval,
): readonly MarketBar[] {
  const ordered = [...bars].sort(
    (left, right) => Date.parse(left.bucketAt) - Date.parse(right.bucketAt),
  );
  const byBucket = new Map<string, MarketBar>();
  for (const bar of ordered) {
    const bucketAt = normalizeMarketBucketAt(bar.bucketAt, interval);
    if (bucketAt === undefined) continue;
    byBucket.set(bucketAt, { ...bar, bucketAt });
  }
  return [...byBucket.values()].sort((left, right) =>
    left.bucketAt.localeCompare(right.bucketAt),
  );
}
