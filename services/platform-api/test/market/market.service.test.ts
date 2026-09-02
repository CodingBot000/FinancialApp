import { describe, expect, it, vi } from 'vitest';

import { MarketService } from '../../src/modules/market/application/market.service.js';
import type { MarketDataProvider } from '../../src/modules/market/application/ports/market-data-provider.port.js';
import type { MarketRepository } from '../../src/modules/market/application/ports/market-repository.port.js';
import type { MarketStock } from '../../src/modules/market/domain/market-model.js';
import { MarketProviderUnavailableError } from '../../src/modules/market/domain/market-errors.js';

const stock: MarketStock = {
  symbol: '005930',
  name: '삼성전자',
  market: 'KOSPI',
  industry: null,
};

function repository(): MarketRepository {
  return {
    findStock: vi.fn().mockResolvedValue(stock),
    latestQuote: vi.fn().mockResolvedValue(undefined),
    listBars: vi.fn().mockResolvedValue([]),
    saveQuote: vi
      .fn()
      .mockImplementation(async (quote) => ({ ...quote, freshness: 'FRESH' })),
    searchStocks: vi.fn().mockResolvedValue([stock]),
    upsertBars: vi.fn().mockResolvedValue(undefined),
    upsertInstruments: vi.fn().mockResolvedValue(1),
  };
}

function provider(): MarketDataProvider {
  return {
    bars: vi.fn().mockResolvedValue({
      source: 'LOCAL',
      bars: [
        {
          bucketAt: '2026-09-01T00:00:00.000Z',
          open: '73000.0000',
          high: '74000.0000',
          low: '72000.0000',
          close: '73500.0000',
          volume: '1000',
        },
      ],
    }),
    quote: vi.fn().mockResolvedValue({
      ...stock,
      currency: 'KRW',
      currentPrice: '74200.0000',
      changePrice: '1200.0000',
      changeRate: '1.6438',
      volume: '1000',
      capturedAt: '2026-09-02T00:00:00.000Z',
      source: 'LOCAL',
    }),
    syncInstruments: vi.fn().mockResolvedValue([]),
  };
}

describe('MarketService', () => {
  it('returns a normalized local quote and bars', async () => {
    const repo = repository();
    const market = new MarketService(provider(), repo);

    await expect(market.quote('005930')).resolves.toMatchObject({
      currentPrice: '74200.0000',
      freshness: 'FRESH',
      source: 'LOCAL',
    });
    await expect(market.bars('005930', 'DAILY')).resolves.toMatchObject({
      freshness: 'FRESH',
      source: 'LOCAL',
      bars: expect.any(Array),
    });
    expect(repo.saveQuote).toHaveBeenCalledOnce();
    expect(repo.upsertBars).toHaveBeenCalledOnce();
  });

  it('serves stale quote cache when provider is unavailable', async () => {
    const repo = repository();
    vi.mocked(repo.latestQuote).mockResolvedValue({
      ...stock,
      currency: 'KRW',
      currentPrice: '70000.0000',
      changePrice: '0.0000',
      changeRate: '0.0000',
      volume: '1000',
      capturedAt: '2020-01-01T00:00:00.000Z',
      source: 'LOCAL',
      freshness: 'FRESH',
    });
    const source = provider();
    vi.mocked(source.quote).mockRejectedValue(
      new MarketProviderUnavailableError('offline'),
    );
    const market = new MarketService(source, repo);

    await expect(market.quote('005930')).resolves.toMatchObject({
      currentPrice: '70000.0000',
      freshness: 'STALE',
    });
  });

  it('deduplicates legacy logical buckets before returning chart data', async () => {
    const repo = repository();
    vi.mocked(repo.listBars).mockResolvedValue([
      {
        bucketAt: '2026-09-01T11:15:29.983Z',
        open: '73000.0000',
        high: '74000.0000',
        low: '72000.0000',
        close: '73500.0000',
        volume: '1000',
      },
      {
        bucketAt: '2026-09-01T15:10:34.997Z',
        open: '73100.0000',
        high: '74100.0000',
        low: '72100.0000',
        close: '73600.0000',
        volume: '1100',
      },
    ]);
    const market = new MarketService(provider(), repo);

    await expect(market.bars('005930', 'DAILY')).resolves.toMatchObject({
      bars: [
        expect.objectContaining({
          bucketAt: '2026-09-01T00:00:00.000Z',
          close: '73600.0000',
        }),
      ],
    });
  });
});
