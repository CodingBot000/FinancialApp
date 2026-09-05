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
  it('returns deterministic market-like OHLC bars for every interval', async () => {
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
      for (const bar of first.bars) {
        expect(Number(bar.high)).toBeGreaterThanOrEqual(
          Math.max(Number(bar.open), Number(bar.close)),
        );
        expect(Number(bar.low)).toBeLessThanOrEqual(
          Math.min(Number(bar.open), Number(bar.close)),
        );
        expect(Number(bar.volume)).toBeGreaterThan(0);
      }
    }
  });

  it('aligns the latest daily bar with the quote and excludes weekends', async () => {
    const provider = new LocalMarketDataAdapter();
    const quote = await provider.quote(stock);
    const result = await provider.bars(stock, 'DAILY');
    const latest = result.bars.at(-1)!;
    const previous = result.bars.at(-2)!;

    expect(latest.close).toBe(quote.currentPrice);
    expect(latest.volume).toBe(quote.volume);
    expect(Number(latest.close) - Number(previous.close)).toBeCloseTo(
      Number(quote.changePrice),
      0,
    );
    expect(
      result.bars.every((bar) => {
        const day = new Date(bar.bucketAt).getUTCDay();
        return day !== 0 && day !== 6;
      }),
    ).toBe(true);
    expect(new Set(result.bars.map((bar) => bar.close)).size).toBeGreaterThan(
      result.bars.length * 0.8,
    );
  });
});
