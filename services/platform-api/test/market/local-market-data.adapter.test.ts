import { describe, expect, it } from 'vitest';

import { MARKET_BAR_LIMITS } from '../../src/modules/market/domain/market-model.js';
import { LocalMarketDataAdapter } from '../../src/modules/market/infrastructure/http/local-market-data.adapter.js';

const stock = {
  symbol: '005930',
  name: '삼성전자',
  market: 'KOSPI' as const,
  industry: null,
};

describe('LocalMarketDataAdapter', () => {
  it('returns deterministic unique buckets for every interval', async () => {
    const provider = new LocalMarketDataAdapter();
    for (const interval of Object.keys(MARKET_BAR_LIMITS) as Array<
      keyof typeof MARKET_BAR_LIMITS
    >) {
      const first = await provider.bars(stock, interval);
      const second = await provider.bars(stock, interval);
      expect(first).toEqual(second);
      expect(first.bars).toHaveLength(MARKET_BAR_LIMITS[interval]);
      expect(new Set(first.bars.map((bar) => bar.bucketAt)).size).toBe(
        first.bars.length,
      );
      expect(first.bars.map((bar) => bar.bucketAt)).toEqual(
        [...first.bars].map((bar) => bar.bucketAt).sort(),
      );
    }
  });
});
