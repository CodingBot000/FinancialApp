import { describe, expect, it } from 'vitest';

import fixture from './mock/fixtures/market-data.success.json';
import {
  isMarketBars,
  isMarketQuoteResponse,
  isMarketStockSearch,
} from './platform-api-contract';

describe('market API contract', () => {
  it('accepts normalized search, quote, and bars fixtures', () => {
    expect(isMarketStockSearch({ stocks: fixture.stocks })).toBe(true);
    expect(isMarketQuoteResponse({ quote: fixture.quote })).toBe(true);
    expect(isMarketBars(fixture.bars)).toBe(true);
  });

  it('rejects malformed market data', () => {
    expect(
      isMarketQuoteResponse({
        quote: { ...fixture.quote, currentPrice: '74200' },
      }),
    ).toBe(false);
    expect(
      isMarketBars({
        ...fixture.bars,
        bars: [{ ...fixture.bars.bars[0], high: '1.0000', low: '2.0000' }],
      }),
    ).toBe(false);
  });
});
