import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createOpenApiResponseValidator,
  type OpenApiResponseValidator,
} from '../../../../contracts/testing/openapi-response-validator.mjs';
import { AppModule } from '../../src/app.module.js';
import { createFastifyAdapter } from '../../src/core/http/create-fastify-adapter.js';
import { AccountRepository } from '../../src/modules/account/account.repository.js';
import { MarketRepository } from '../../src/modules/market/market.repository.js';
import { SCENARIO_REPOSITORY } from '../../src/modules/scenario/application/ports/scenario-repository.port.js';
import type { ScenarioMode } from '../../src/modules/scenario/domain/scenario-mode.js';
import { BROKERAGE_REPOSITORY } from '../../src/modules/trading/application/ports/brokerage-repository.port.js';
import type { BrokerageOrderView } from '../../src/modules/trading/domain/brokerage-order.js';

describe('simulator market, brokerage, and admin HTTP contracts', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;
  let contract: OpenApiResponseValidator;
  let mode: ScenarioMode = 'NORMAL';
  const orders = new Map<string, BrokerageOrderView>();
  const scenarioRepository = {
    current: vi.fn(async () => mode),
    set: vi.fn(async (next: ScenarioMode) => {
      mode = next;
    }),
    reset: vi.fn(async () => {
      mode = 'NORMAL';
      orders.clear();
    }),
    seed: vi.fn(),
  };
  const accountRepository = { seedBalancedWorker: vi.fn() };
  const marketRepository = {
    instruments: vi.fn().mockResolvedValue([
      {
        instrumentId: 'SYNTH-EQUITY-001',
        displayName: '가상 성장형 펀드',
        assetClass: 'EQUITY',
        currency: 'KRW',
        status: 'ACTIVE',
      },
    ]),
    prices: vi.fn().mockResolvedValue([
      {
        instrumentId: 'SYNTH-EQUITY-001',
        price: '125000.0000',
        currency: 'KRW',
        asOfAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]),
    history: vi.fn().mockResolvedValue([
      {
        instrumentId: 'SYNTH-EQUITY-001',
        price: '125000.0000',
        currency: 'KRW',
        asOfAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]),
  };
  const brokerageRepository = {
    submit: vi.fn(
      async (
        request: { clientOrderId: string; quantity: string },
        _hash: string,
        scenarioMode: ScenarioMode,
      ) => {
        const existing = orders.get(request.clientOrderId);
        if (existing !== undefined) {
          return { kind: 'accepted' as const, created: false, order: existing };
        }
        const status =
          scenarioMode === 'ORDER_REJECT'
            ? 'REJECTED'
            : scenarioMode === 'ORDER_UNKNOWN_THEN_FILLED'
              ? 'UNKNOWN'
              : 'FILLED';
        const order: BrokerageOrderView = {
          clientOrderId: request.clientOrderId,
          externalOrderId: `SIM-${request.clientOrderId}`,
          status,
          side: 'BUY',
          quantity: request.quantity,
          unitPrice: '125000.0000',
          filledAmount: status === 'FILLED' ? '375000.0000' : null,
          executedAt: status === 'FILLED' ? '2026-09-02T00:00:00.000Z' : null,
        };
        orders.set(request.clientOrderId, order);
        return { kind: 'accepted' as const, created: true, order };
      },
    ),
    find: vi.fn(async (clientOrderId: string) => {
      const order = orders.get(clientOrderId);
      if (order?.status !== 'UNKNOWN') return order;
      const filled: BrokerageOrderView = {
        ...order,
        status: 'FILLED',
        filledAmount: '375000.0000',
        executedAt: '2026-09-02T00:00:01.000Z',
      };
      orders.set(clientOrderId, filled);
      return filled;
    }),
  };

  beforeAll(async () => {
    process.env.APP_ENV = 'test';
    process.env.SIMULATOR_SCENARIO_TIMEOUT_MS = '20';
    contract = await createOpenApiResponseValidator(
      new URL(
        '../../../../contracts/openapi/institution-simulator-v1.yaml',
        import.meta.url,
      ),
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AccountRepository)
      .useValue(accountRepository)
      .overrideProvider(MarketRepository)
      .useValue(marketRepository)
      .overrideProvider(SCENARIO_REPOSITORY)
      .useValue(scenarioRepository)
      .overrideProvider(BROKERAGE_REPOSITORY)
      .useValue(brokerageRepository)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.APP_ENV;
    delete process.env.SIMULATOR_SCENARIO_TIMEOUT_MS;
  });

  async function setScenario(next: ScenarioMode) {
    return app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'PUT',
        url: '/sim/v1/admin/scenario',
        payload: { mode: next },
      });
  }

  function orderPayload(clientOrderId: string) {
    return {
      clientOrderId,
      accountId: 'SYNTH-ACCOUNT-A-001',
      instrumentId: 'SYNTH-EQUITY-001',
      side: 'BUY',
      quantity: '3.00000000',
    };
  }

  it('validates every new success operation through Fastify', async () => {
    await setScenario('NORMAL');
    const operations = [
      {
        operationId: 'getSimulatorInstruments',
        method: 'GET' as const,
        url: '/sim/v1/market/instruments',
      },
      {
        operationId: 'getSimulatorPrices',
        method: 'GET' as const,
        url: '/sim/v1/market/prices?instrumentIds=SYNTH-EQUITY-001',
      },
      {
        operationId: 'getSimulatorMarketHistory',
        method: 'GET' as const,
        url: '/sim/v1/market/history?instrumentId=SYNTH-EQUITY-001&range=1M',
      },
      {
        operationId: 'submitSimulatorOrder',
        method: 'POST' as const,
        url: '/sim/v1/brokerage/orders',
        payload: orderPayload('91000000-0000-4000-8000-000000000001'),
        expectedStatus: 201,
      },
      {
        operationId: 'getSimulatorOrder',
        method: 'GET' as const,
        url: '/sim/v1/brokerage/orders/by-client-order-id/91000000-0000-4000-8000-000000000001',
      },
      {
        operationId: 'setSimulatorScenario',
        method: 'PUT' as const,
        url: '/sim/v1/admin/scenario',
        payload: { mode: 'NORMAL' },
      },
      {
        operationId: 'resetSimulatorDataset',
        method: 'POST' as const,
        url: '/sim/v1/admin/reset',
      },
    ];

    for (const request of operations) {
      const response = await app.getHttpAdapter().getInstance().inject(request);
      const expected =
        'expectedStatus' in request ? request.expectedStatus : 200;
      expect(response.statusCode, request.operationId).toBe(expected);
      contract.validate(request.operationId, expected, response.json());
    }
  });

  it('reproduces timeout, HTTP_500, and malformed response modes over HTTP', async () => {
    await setScenario('TIMEOUT');
    await expect(
      fetch(
        new URL(
          '/sim/v1/market/prices?instrumentIds=SYNTH-EQUITY-001',
          baseUrl,
        ),
        { signal: AbortSignal.timeout(5) },
      ),
    ).rejects.toThrow();
    const started = Date.now();
    const delayed = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/sim/v1/market/prices?instrumentIds=SYNTH-EQUITY-001',
    });
    expect(delayed.statusCode).toBe(200);
    expect(Date.now() - started).toBeGreaterThanOrEqual(15);

    await setScenario('HTTP_500');
    const failed = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/sim/v1/market/prices?instrumentIds=SYNTH-EQUITY-001',
    });
    expect(failed.statusCode).toBe(500);
    contract.validate('getSimulatorPrices', 500, failed.json());

    await setScenario('MALFORMED_RESPONSE');
    const malformed = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/sim/v1/market/prices?instrumentIds=SYNTH-EQUITY-001',
    });
    expect(malformed.statusCode).toBe(200);
    expect(malformed.json()).toEqual({ items: 'invalid' });
  });

  it('reproduces reject and UNKNOWN then FILLED reconciliation deterministically', async () => {
    await setScenario('ORDER_REJECT');
    const rejected = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/sim/v1/brokerage/orders',
        payload: orderPayload('91000000-0000-4000-8000-000000000002'),
      });
    expect(rejected.statusCode).toBe(201);
    expect(rejected.json().status).toBe('REJECTED');

    await setScenario('ORDER_UNKNOWN_THEN_FILLED');
    const unknown = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/sim/v1/brokerage/orders',
        payload: orderPayload('91000000-0000-4000-8000-000000000003'),
      });
    expect(unknown.statusCode).toBe(201);
    expect(unknown.json().status).toBe('UNKNOWN');
    const reconciled = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/sim/v1/brokerage/orders/by-client-order-id/91000000-0000-4000-8000-000000000003',
    });
    expect(reconciled.statusCode).toBe(200);
    expect(reconciled.json().status).toBe('FILLED');
  });

  it('returns canonical 404 and does not mutate scenario in production', async () => {
    process.env.APP_ENV = 'production';
    const callsBefore = scenarioRepository.set.mock.calls.length;
    const response = await setScenario('NORMAL');
    process.env.APP_ENV = 'test';

    expect(response.statusCode).toBe(404);
    contract.validate('setSimulatorScenario', 404, response.json());
    expect(scenarioRepository.set.mock.calls).toHaveLength(callsBefore);
  });
});
