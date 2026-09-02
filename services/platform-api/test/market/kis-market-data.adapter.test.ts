import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MarketDataInvalidError,
  MarketProviderUnavailableError,
  MarketRateLimitedError,
} from '../../src/modules/market/domain/market-errors.js';
import { KisMarketDataAdapter } from '../../src/modules/market/infrastructure/http/kis-market-data.adapter.js';
import { parseKisMasterText } from '../../src/modules/market/infrastructure/http/kis-stock-master.js';

const stock = {
  symbol: '005930',
  name: '삼성전자',
  market: 'KOSPI' as const,
  industry: null,
};

describe('KisMarketDataAdapter', () => {
  const previous = {
    baseUrl: process.env.KIS_BASE_URL,
    appKey: process.env.KIS_APP_KEY,
    appSecret: process.env.KIS_APP_SECRET,
  };

  beforeEach(() => {
    process.env.KIS_BASE_URL = 'https://kis.example.test';
    process.env.KIS_APP_KEY = 'change-me-kis-key';
    process.env.KIS_APP_SECRET = 'change-me-kis-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restore('KIS_BASE_URL', previous.baseUrl);
    restore('KIS_APP_KEY', previous.appKey);
    restore('KIS_APP_SECRET', previous.appSecret);
  });

  it('maps a KIS quote without exposing provider fields', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({ access_token: 'change-me-access-token', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(
        json({
          rt_cd: '0',
          output: {
            acml_vol: '12,452,301',
            prdy_ctrt: '1.6438',
            prdy_vrss: '1,200',
            stck_prpr: '74,200',
          },
        }),
      );
    vi.stubGlobal('fetch', fetch);

    const quote = await new KisMarketDataAdapter().quote(stock);

    expect(quote).toMatchObject({
      symbol: '005930',
      currentPrice: '74200.0000',
      changePrice: '1200.0000',
      changeRate: '1.6438',
      volume: '12452301',
      source: 'KIS',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1]?.[0])).toContain(
      '/uapi/domestic-stock/v1/quotations/inquire-price?',
    );
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        appkey: 'change-me-kis-key',
        tr_id: 'FHKST01010100',
      }),
    });
  });

  it('maps daily bars and rejects malformed provider rows', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({ access_token: 'change-me-access-token', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(
        json({
          rt_cd: '0',
          output2: [
            {
              acml_vol: '1000',
              stck_bsop_date: '20260901',
              stck_clpr: '74200',
              stck_hgpr: '74600',
              stck_lwpr: '72800',
              stck_oprc: '73100',
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(
      new KisMarketDataAdapter().bars(stock, 'DAILY'),
    ).resolves.toEqual({
      source: 'KIS',
      bars: [
        {
          bucketAt: '2026-09-01T00:00:00.000Z',
          open: '73100.0000',
          high: '74600.0000',
          low: '72800.0000',
          close: '74200.0000',
          volume: '1000',
        },
      ],
    });

    const malformedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({ access_token: 'change-me-access-token', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(json({ rt_cd: '0', output: { stck_prpr: '0' } }));
    vi.stubGlobal('fetch', malformedFetch);
    await expect(
      new KisMarketDataAdapter().quote(stock),
    ).rejects.toBeInstanceOf(MarketDataInvalidError);
  });

  it('fails closed when KIS credentials are missing', async () => {
    delete process.env.KIS_APP_KEY;
    await expect(
      new KisMarketDataAdapter().quote(stock),
    ).rejects.toBeInstanceOf(MarketProviderUnavailableError);
  });

  it('maps rate limits and sends the minute-bar TR parameters', async () => {
    const rateLimitedFetch = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: 'change-me-access-token' }))
      .mockResolvedValueOnce(json({ rt_cd: '1' }, 429));
    vi.stubGlobal('fetch', rateLimitedFetch);
    await expect(
      new KisMarketDataAdapter().quote(stock),
    ).rejects.toBeInstanceOf(MarketRateLimitedError);

    const minuteFetch = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: 'change-me-access-token' }))
      .mockResolvedValueOnce(
        json({
          rt_cd: '0',
          output2: [
            {
              cntg_vol: '50',
              stck_bsop_date: '20260902',
              stck_cntg_hour: '101530',
              stck_hgpr: '74300',
              stck_lwpr: '74100',
              stck_oprc: '74200',
              stck_prpr: '74250',
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', minuteFetch);
    await expect(
      new KisMarketDataAdapter().bars(stock, 'MINUTE'),
    ).resolves.toMatchObject({
      source: 'KIS',
      bars: [expect.objectContaining({ close: '74250.0000' })],
    });
    expect(String(minuteFetch.mock.calls[1]?.[0])).toContain(
      '/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice?',
    );
    expect(minuteFetch.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ tr_id: 'FHKST03010200' }),
    });
  });
});

describe('KIS stock master parser', () => {
  it('parses the fixed-width symbol head for a market', () => {
    const head = `${'005930'.padEnd(9)}${'123456789012'}삼성전자`;
    const rows = parseKisMasterText(
      `${head}${' '.repeat(228)}\n`,
      'KOSPI',
      228,
    );
    expect(rows).toEqual([
      expect.objectContaining({
        symbol: '005930',
        name: '삼성전자',
        market: 'KOSPI',
        source: 'KIS_MASTER',
      }),
    ]);
  });
});

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
