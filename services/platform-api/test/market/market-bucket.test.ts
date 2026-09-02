import { describe, expect, it } from 'vitest';

import {
  deduplicateMarketBars,
  normalizeMarketBucketAt,
} from '../../src/modules/market/domain/market-bucket.js';

const bar = (bucketAt: string, close: string) => ({
  bucketAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: '1000',
});

describe('market logical buckets', () => {
  it('normalizes every supported interval to a stable boundary', () => {
    expect(normalizeMarketBucketAt('2026-09-03T04:05:59.999Z', 'MINUTE')).toBe(
      '2026-09-03T04:05:00.000Z',
    );
    expect(normalizeMarketBucketAt('2026-09-03T14:31:50.105Z', 'DAILY')).toBe(
      '2026-09-03T00:00:00.000Z',
    );
    expect(normalizeMarketBucketAt('2026-09-03T14:31:50.105Z', 'WEEKLY')).toBe(
      '2026-08-31T00:00:00.000Z',
    );
    expect(normalizeMarketBucketAt('2026-09-03T14:31:50.105Z', 'MONTHLY')).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(normalizeMarketBucketAt('2026-09-03T14:31:50.105Z', 'YEARLY')).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('keeps the newest duplicate value and returns ascending buckets', () => {
    expect(
      deduplicateMarketBars(
        [
          bar('2026-09-02T15:10:34.997Z', '74200.0000'),
          bar('2026-09-01T14:31:50.105Z', '73000.0000'),
          bar('2026-09-02T11:15:29.983Z', '74000.0000'),
        ],
        'DAILY',
      ),
    ).toEqual([
      bar('2026-09-01T00:00:00.000Z', '73000.0000'),
      bar('2026-09-02T00:00:00.000Z', '74200.0000'),
    ]);
  });

  it('drops invalid timestamps without inventing a zero bucket', () => {
    expect(deduplicateMarketBars([bar('invalid', '1.0000')], 'DAILY')).toEqual(
      [],
    );
  });
});
