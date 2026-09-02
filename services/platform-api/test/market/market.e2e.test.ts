import 'reflect-metadata';

import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createOpenApiResponseValidator } from '../../../../contracts/testing/openapi-response-validator.mjs';
import { createFastifyAdapter } from '../../src/core/http/create-fastify-adapter.js';
import { MarketService } from '../../src/modules/market/application/market.service.js';
import { MARKET_DATA_PROVIDER } from '../../src/modules/market/application/ports/market-data-provider.port.js';
import { MARKET_REPOSITORY } from '../../src/modules/market/application/ports/market-repository.port.js';
import { MarketController } from '../../src/modules/market/api/market.controller.js';

describe('market provider boundary', () => {
  let app: NestFastifyApplication;
  let contract: Awaited<ReturnType<typeof createOpenApiResponseValidator>>;

  const stock = {
    symbol: '005930',
    name: '삼성전자',
    market: 'KOSPI' as const,
    industry: '전자부품 제조업',
  };
  const quote = {
    ...stock,
    currency: 'KRW' as const,
    currentPrice: '74200.0000',
    changePrice: '1200.0000',
    changeRate: '1.6438',
    volume: '12452301',
    capturedAt: '2026-09-02T00:00:00.000Z',
    source: 'LOCAL' as const,
  };
  const bars = [
    {
      bucketAt: '2026-09-01T00:00:00.000Z',
      open: '73100.0000',
      high: '74600.0000',
      low: '72800.0000',
      close: '74200.0000',
      volume: '1000',
    },
  ];

  beforeAll(async () => {
    contract = await createOpenApiResponseValidator(
      new URL(
        '../../../../contracts/openapi/platform-v1.yaml',
        import.meta.url,
      ),
    );

    const provider = {
      quote: vi.fn().mockResolvedValue(quote),
      bars: vi.fn().mockResolvedValue({ bars, source: 'LOCAL' as const }),
      syncInstruments: vi.fn().mockResolvedValue([]),
    };
    const repository = {
      searchStocks: vi.fn().mockResolvedValue([stock]),
      findStock: vi.fn().mockResolvedValue(stock),
      latestQuote: vi.fn().mockResolvedValue(undefined),
      saveQuote: vi.fn().mockImplementation(async (value) => ({
        ...value,
        freshness: 'FRESH' as const,
      })),
      listBars: vi.fn().mockResolvedValue([]),
      upsertBars: vi.fn().mockResolvedValue(undefined),
      upsertInstruments: vi.fn().mockResolvedValue(0),
    };

    Reflect.defineMetadata(GUARDS_METADATA, [], MarketController);

    const moduleRef = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        MarketService,
        { provide: MARKET_DATA_PROVIDER, useValue: provider },
        { provide: MARKET_REPOSITORY, useValue: repository },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('searchMarketStocks returns catalog matches', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/market/stocks?q=삼성&limit=10' });

    expect(response.statusCode).toBe(200);
    contract.validate('searchMarketStocks', 200, response.json());
  });

  it('getMarketStockQuote returns normalized quote data', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/market/stocks/005930/quote' });

    expect(response.statusCode).toBe(200);
    contract.validate('getMarketStockQuote', 200, response.json());
  });

  it('getMarketStockBars returns normalized chart data and validates interval', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/market/stocks/005930/bars?interval=DAILY',
    });

    expect(response.statusCode).toBe(200);
    contract.validate('getMarketStockBars', 200, response.json());

    const invalid = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/market/stocks/005930/bars?interval=INVALID',
    });
    expect(invalid.statusCode).toBe(400);
    contract.validate('getMarketStockBars', 400, invalid.json());
  });
});
