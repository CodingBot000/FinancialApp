import { describe, expect, it, vi } from 'vitest';

import { HttpPlatformApi } from './http-platform-api';
import type { PlatformApiError } from './platform-api';
import wealthFixture from './mock/fixtures/wealth-dashboard.success.json';
import simulationFixture from './mock/fixtures/simulation.success.json';
import orderFixture from './mock/fixtures/order-flow.success.json';
import marketFixture from './mock/fixtures/market-data.success.json';

describe('HttpPlatformApi', () => {
  it('uses PUT for scenarios and a bodyless POST for dataset reset', async () => {
    const authenticatedFetch = vi.fn(
      async (url: string, init?: RequestInit) => {
        void init;
        return url.endsWith('/scenario')
          ? Response.json({ mode: 'ORDER_REJECT', scope: 'GLOBAL' })
          : Response.json({
              datasetVersion: 'baseline-v1',
              scenarioMode: 'NORMAL',
              syntheticData: true,
            });
      },
    );
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example',
      requestId: () => 'request-fe-0014',
    });

    await expect(api.setDeveloperScenario('ORDER_REJECT')).resolves.toEqual({
      mode: 'ORDER_REJECT',
      scope: 'GLOBAL',
    });
    await expect(api.resetDeveloperDataset()).resolves.toMatchObject({
      scenarioMode: 'NORMAL',
      syntheticData: true,
    });
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      1,
      'https://platform.example/api/v1/dev/scenario',
      expect.objectContaining({
        body: JSON.stringify({
          mode: 'ORDER_REJECT',
          correlationScope: 'CURRENT_USER',
        }),
        method: 'PUT',
      }),
    );
    const resetInit = authenticatedFetch.mock.calls[1]?.[1];
    expect(resetInit).toMatchObject({ method: 'POST' });
    expect(resetInit?.body).toBeUndefined();
    expect(resetInit?.headers).not.toHaveProperty('Content-Type');
  });

  it('maps quote/order/history and sends one caller-owned idempotency key', async () => {
    const authenticatedFetch = vi.fn(
      async (url: string, init?: RequestInit) => {
        if (url.endsWith('/orders/preview'))
          return Response.json(orderFixture.quote, { status: 201 });
        if (url.includes('/orders?'))
          return Response.json({
            items: [orderFixture.order],
            nextCursor: null,
          });
        return Response.json(orderFixture.order, {
          status: init?.method === 'POST' ? 201 : 200,
        });
      },
    );
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example',
    });
    const input = {
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      quantity: '3.00000000',
      side: 'BUY' as const,
    };
    const quote = await api.previewBuyOrder(input);
    await expect(
      api.prepareBuyOrder(
        { ...input, quoteId: quote.quoteId },
        '92000000-0000-4000-8000-000000000001',
      ),
    ).resolves.toMatchObject({ status: 'FILLED' });
    await expect(
      api.getOrder(orderFixture.order.orderId),
    ).resolves.toMatchObject({ status: 'FILLED' });
    await expect(api.listOrders(undefined, 20)).resolves.toMatchObject({
      nextCursor: null,
    });
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      2,
      'https://platform.example/api/v1/orders',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': '92000000-0000-4000-8000-000000000001',
        }),
        method: 'POST',
      }),
    );
  });

  it('creates and reads only canonical persisted simulation results', async () => {
    const authenticatedFetch = vi.fn(async () =>
      Response.json(simulationFixture, { status: 201 }),
    );
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example',
    });
    const input = {
      allocation: [
        { assetClass: 'CASH' as const, weight: 0.1 },
        { assetClass: 'BOND' as const, weight: 0.3 },
        { assetClass: 'EQUITY' as const, weight: 0.6 },
      ],
      durationMonths: 120,
      initialAssets: '185400000.0000',
      monthlyContribution: '1500000.0000',
      targetAmount: '450000000.0000',
    };

    await expect(api.createSimulation(input)).resolves.toMatchObject({
      engineVersion: '1.0.0',
    });
    await expect(
      api.getSimulation(simulationFixture.simulationId),
    ).resolves.toMatchObject({ assumptionSetVersion: 'SYNTHETIC_V1' });
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      1,
      'https://platform.example/api/v1/simulations',
      expect.objectContaining({ body: JSON.stringify(input), method: 'POST' }),
    );
  });

  it('preserves canonical problem codes for field-error UX', async () => {
    const api = new HttpPlatformApi({
      authenticatedFetch: async () =>
        Response.json(
          {
            code: 'VALIDATION_FAILED',
            detail: 'Simulation request is invalid.',
            retryable: false,
          },
          { status: 400 },
        ),
      baseUrl: 'https://platform.example',
    });

    await expect(api.getSimulation('bad')).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Simulation request is invalid.',
      retryable: false,
      status: 400,
    });
  });

  it('maps every FE-0011 wealth operation and POST body', async () => {
    const authenticatedFetch = vi.fn(
      async (url: string, init?: RequestInit) => {
        if (url.endsWith('/mydata/connections')) {
          return Response.json(
            init?.method === 'POST'
              ? wealthFixture.connection
              : [wealthFixture.connection],
          );
        }
        if (url.endsWith('/mydata/syncs'))
          return Response.json(wealthFixture.sync, { status: 202 });
        if (url.includes('/mydata/syncs/'))
          return Response.json(wealthFixture.sync);
        if (url.endsWith('/assets/summary'))
          return Response.json(wealthFixture.summary);
        if (url.includes('/assets/history'))
          return Response.json({ points: wealthFixture.history });
        if (url.includes('/accounts/'))
          return Response.json(wealthFixture.accounts[0]);
        if (url.endsWith('/accounts'))
          return Response.json({
            items: wealthFixture.accounts,
            nextCursor: null,
          });
        if (url.includes('/holdings'))
          return Response.json({
            items: wealthFixture.holdings,
            nextCursor: null,
          });
        return Response.json({
          items: wealthFixture.transactions,
          nextCursor: null,
        });
      },
    );
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example',
      requestId: () => 'request-fe-0011',
    });

    await expect(
      api.createMyDataConnection('2027-09-01T00:00:00.000Z'),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(api.listMyDataConnections()).resolves.toHaveLength(1);
    await expect(
      api.createMyDataSync(wealthFixture.connection.connectionId),
    ).resolves.toMatchObject({ status: 'COMPLETED' });
    await expect(
      api.getMyDataSync(wealthFixture.sync.syncId),
    ).resolves.toMatchObject({ counts: { accounts: 1 } });
    await expect(api.getAssetSummary()).resolves.toMatchObject({
      totalAssets: '185400000.0000',
    });
    await expect(api.listAccounts()).resolves.toMatchObject({
      nextCursor: null,
    });
    await expect(
      api.getAccount(wealthFixture.accounts[0]!.accountId),
    ).resolves.toMatchObject({ maskedAccountNumber: '***-**-0001' });
    await expect(
      api.listHoldings(wealthFixture.accounts[0]!.accountId),
    ).resolves.toMatchObject({ items: [{ quantity: '1360.00000000' }] });
    await expect(api.listTransactions()).resolves.toMatchObject({
      items: [{ transactionType: 'DEPOSIT' }],
    });
    await expect(api.getAssetHistory('1Y')).resolves.toHaveLength(2);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      'https://platform.example/api/v1/mydata/syncs',
      expect.objectContaining({
        body: JSON.stringify({
          connectionId: wealthFixture.connection.connectionId,
        }),
        method: 'POST',
      }),
    );
  });
  it('maps the authenticated canonical current user response', async () => {
    const authenticatedFetch = vi.fn(async () =>
      Response.json({
        datasetVersion: 'FINANCIAL_APP_DATASET_V1',
        displayName: '테스트 사용자 A',
        riskProfile: 'BALANCED',
        syntheticData: true,
        userId: '4e34157c-f4fa-4f77-aeaf-19ea60ec6806',
      }),
    );
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example/',
      requestId: () => 'request-fe-0010',
    });

    await expect(api.getCurrentUser()).resolves.toMatchObject({
      displayName: '테스트 사용자 A',
      riskProfile: 'BALANCED',
      syntheticData: true,
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      'https://platform.example/api/v1/me',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('reads and replaces the versioned risk profile with PUT', async () => {
    const profile = {
      riskLevel: 'GROWTH' as const,
      investmentHorizonMonths: 180,
      monthlyContribution: '2000000.0000',
      version: '1',
      updatedAt: '2026-09-02T00:01:00.000Z',
    };
    const authenticatedFetch = vi.fn(async () => Response.json(profile));
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example',
    });

    await expect(api.getRiskProfile()).resolves.toEqual(profile);
    await expect(
      api.updateRiskProfile({
        riskLevel: 'GROWTH',
        investmentHorizonMonths: 180,
        monthlyContribution: '2000000.0000',
        expectedVersion: '0',
      }),
    ).resolves.toEqual(profile);
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      2,
      'https://platform.example/api/v1/me/risk-profile',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          riskLevel: 'GROWTH',
          investmentHorizonMonths: 180,
          monthlyContribution: '2000000.0000',
          expectedVersion: '0',
        }),
      }),
    );
  });

  it('keeps missing-scope failures non-retryable', async () => {
    const api = new HttpPlatformApi({
      authenticatedFetch: async () => new Response(undefined, { status: 403 }),
      baseUrl: 'https://platform.example',
    });

    await expect(api.getCurrentUser()).rejects.toMatchObject({
      kind: 'http',
      retryable: false,
      status: 403,
    } satisfies Partial<PlatformApiError>);
  });

  it('rejects a current user response outside the canonical schema', async () => {
    const api = new HttpPlatformApi({
      authenticatedFetch: async () =>
        Response.json({
          displayName: '테스트 사용자 A',
          riskProfile: 'BALANCED',
          syntheticData: false,
          userId: 'not-a-uuid',
        }),
      baseUrl: 'https://platform.example',
    });

    await expect(api.getCurrentUser()).rejects.toMatchObject({
      kind: 'contract',
      retryable: false,
    } satisfies Partial<PlatformApiError>);
  });

  it('calls the canonical health endpoint with a request ID', async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        datasetVersion: 'baseline-v1',
        service: 'platform-api',
        status: 'ok',
      }),
    );
    const api = new HttpPlatformApi({
      baseUrl: 'https://platform.example/',
      fetch,
      requestId: () => 'request-fe-0001',
    });

    await expect(api.getHealth()).resolves.toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://platform.example/api/v1/health',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'X-Request-Id': 'request-fe-0001',
        },
        method: 'GET',
      }),
    );
  });

  it('maps the market search, quote, and bars endpoints', async () => {
    const authenticatedFetch = vi.fn(async (url: string) => {
      if (url.includes('/market/stocks?q=')) {
        return Response.json({ stocks: marketFixture.stocks });
      }
      if (url.endsWith('/quote')) {
        return Response.json({ quote: marketFixture.quote });
      }
      return Response.json(marketFixture.bars);
    });
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example',
    });

    await expect(api.searchMarketStocks('삼성')).resolves.toHaveLength(3);
    await expect(api.getMarketQuote('005930')).resolves.toMatchObject({
      currentPrice: '74200.0000',
    });
    await expect(api.getMarketBars('005930', 'DAILY')).resolves.toMatchObject({
      interval: 'DAILY',
      bars: expect.any(Array),
    });
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      1,
      'https://platform.example/api/v1/market/stocks?q=%EC%82%BC%EC%84%B1&limit=30',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(authenticatedFetch).toHaveBeenNthCalledWith(
      3,
      'https://platform.example/api/v1/market/stocks/005930/bars?interval=DAILY',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('normalizes a retryable HTTP failure', async () => {
    const api = new HttpPlatformApi({
      baseUrl: 'https://platform.example',
      fetch: async () => new Response(undefined, { status: 429 }),
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'http',
      retryable: true,
      status: 429,
    } satisfies Partial<PlatformApiError>);
  });

  it('rejects a response outside the canonical schema', async () => {
    const api = new HttpPlatformApi({
      baseUrl: 'https://platform.example',
      fetch: async () =>
        Response.json({ service: 'platform-api', status: 'ok' }),
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'contract',
      retryable: false,
    } satisfies Partial<PlatformApiError>);
  });
});
