import { createServer, type Server } from 'node:http';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createOpenApiResponseValidator,
  type OpenApiResponseValidator,
} from '../../../../contracts/testing/openapi-response-validator.mjs';
import { AppModule } from '../../src/app.module.js';
import { createFastifyAdapter } from '../../src/core/http/create-fastify-adapter.js';
import { IDENTITY_REPOSITORY } from '../../src/modules/identity/application/ports/identity-repository.port.js';
import { INSTITUTION_PORT } from '../../src/modules/mydata/application/ports/institution.port.js';
import { MYDATA_REPOSITORY } from '../../src/modules/mydata/application/ports/mydata-repository.port.js';
import { SENSITIVE_DATA_PORT } from '../../src/modules/mydata/application/ports/sensitive-data.port.js';
import { SIMULATION_REPOSITORY } from '../../src/modules/simulation/application/ports/simulation-repository.port.js';
import { MARKET_PRICE_PORT } from '../../src/modules/trading/application/ports/market-price.port.js';
import { BROKERAGE_PORT } from '../../src/modules/trading/application/ports/brokerage.port.js';
import { TRADING_REPOSITORY } from '../../src/modules/trading/application/ports/trading-repository.port.js';
import { AuditService } from '../../src/modules/audit/audit.service.js';
import { WEALTH_REPOSITORY } from '../../src/modules/wealth/application/ports/wealth-repository.port.js';

describe('GET /api/v1/me OIDC boundary', () => {
  const identityRepository = {
    provisionFromOidc: vi.fn().mockResolvedValue({
      userId: '4e34157c-f4fa-4f77-aeaf-19ea60ec6806',
      displayName: '테스트 사용자 A',
      riskProfile: 'BALANCED',
      datasetVersion: 'FINANCIAL_APP_DATASET_V1',
      syntheticData: true,
    }),
  };
  const myDataRepository = {
    createConnection: vi.fn().mockResolvedValue({
      connectionId: '44fc3d1c-cd8f-46ba-833f-96dac39dddfd',
      institutionCode: 'SYNTH_WEALTH_001',
      status: 'ACTIVE',
      consentExpiresAt: '2027-09-01T00:00:00.000Z',
      lastSuccessfulSyncAt: null,
    }),
    listConnections: vi.fn().mockResolvedValue([]),
    createSync: vi.fn().mockResolvedValue({
      created: true,
      sync: {
        syncId: '4467ac44-cf36-449a-b9f9-2b29924a6212',
        connectionId: '44fc3d1c-cd8f-46ba-833f-96dac39dddfd',
        status: 'QUEUED',
        createdAt: '2026-09-01T10:00:00.000Z',
        startedAt: null,
        completedAt: null,
        counts: { rawRecords: 0, accounts: 0, holdings: 0, transactions: 0 },
        errorCode: null,
      },
    }),
    getSync: vi.fn().mockResolvedValue({
      syncId: '4467ac44-cf36-449a-b9f9-2b29924a6212',
      connectionId: '44fc3d1c-cd8f-46ba-833f-96dac39dddfd',
      status: 'COMPLETED',
      createdAt: '2026-09-01T10:00:00.000Z',
      startedAt: '2026-09-01T10:00:01.000Z',
      completedAt: '2026-09-01T10:00:02.000Z',
      counts: { rawRecords: 3, accounts: 1, holdings: 1, transactions: 1 },
      errorCode: null,
    }),
    beginSync: vi.fn(),
    completeSync: vi.fn(),
    failSync: vi.fn(),
  };
  const sensitiveData = {
    encrypt: vi.fn().mockReturnValue({
      ciphertext: Buffer.from('encrypted-test-value'),
      keyVersion: 'test-v1',
    }),
    decrypt: vi.fn(),
    lookupHash: vi.fn().mockReturnValue('a'.repeat(64)),
  };
  const wealthRepository = {
    summary: vi.fn().mockResolvedValue({
      asOfDate: '2026-09-01',
      currency: 'KRW',
      totalAssets: '185400000.0000',
      cash: '15400000.0000',
      investments: '170000000.0000',
      change: { amount: '0.0000', rate: 0 },
      allocation: [],
      lastSyncedAt: '2026-09-01T10:00:02.000Z',
    }),
    accounts: vi.fn().mockResolvedValue([
      {
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        institutionCode: 'SYNTH_WEALTH_001',
        maskedAccountNumber: '***-**-0001',
        accountType: 'BROKERAGE',
        currency: 'KRW',
        status: 'ACTIVE',
        cashBalance: '15400000.0000',
      },
    ]),
    account: vi.fn().mockResolvedValue({
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      institutionCode: 'SYNTH_WEALTH_001',
      maskedAccountNumber: '***-**-0001',
      accountType: 'BROKERAGE',
      currency: 'KRW',
      status: 'ACTIVE',
      cashBalance: '15400000.0000',
    }),
    holdings: vi.fn().mockResolvedValue([
      {
        holdingId: '788c601b-ab70-4683-9dd4-6a1174550653',
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
        instrumentCode: 'SYNTH-EQUITY-001',
        displayName: 'Synthetic Equity Fund',
        assetClass: 'EQUITY',
        quantity: '1360.00000000',
        averagePrice: '125000.0000',
        marketValue: '170000000.0000',
        asOfAt: '2026-09-01T10:00:02.000Z',
      },
    ]),
    transactions: vi.fn().mockResolvedValue([
      {
        transactionId: '888c601b-ab70-4683-9dd4-6a1174550653',
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        transactionType: 'DEPOSIT',
        amount: '15400000.0000',
        currency: 'KRW',
        occurredAt: '2026-09-01T09:00:00.000Z',
      },
    ]),
    history: vi.fn().mockResolvedValue([
      {
        date: '2026-09-01',
        totalAssets: '185400000.0000',
        cash: '15400000.0000',
        investments: '170000000.0000',
      },
    ]),
  };
  const simulationRepository = {
    activeAssumption: vi.fn().mockResolvedValue({
      id: '60000000-0000-4000-8000-000000000001',
      version: 'SYNTHETIC_V1',
      assets: {
        CASH: {
          expectedAnnualReturn: 0.025,
          annualVolatility: 0.005,
          annualFee: 0.001,
        },
        BOND: {
          expectedAnnualReturn: 0.04,
          annualVolatility: 0.08,
          annualFee: 0.002,
        },
        EQUITY: {
          expectedAnnualReturn: 0.07,
          annualVolatility: 0.18,
          annualFee: 0.004,
        },
      },
      correlation: [
        [1, 0.15, 0.05],
        [0.15, 1, 0.25],
        [0.05, 0.25, 1],
      ],
    }),
    save: vi.fn().mockResolvedValue({
      simulationId: 'df4ee3a2-df76-454e-9627-57fcafda7f8d',
      engineVersion: '1.0.0',
      assumptionSetVersion: 'SYNTHETIC_V1',
      currency: 'KRW',
      goalProbability: 0.71,
      finalValue: {
        p10: '338200000.0000',
        p50: '426300000.0000',
        p90: '548100000.0000',
      },
      series: [
        {
          month: 0,
          p10: '185400000.0000',
          p50: '185400000.0000',
          p90: '185400000.0000',
        },
        {
          month: 1,
          p10: '184000000.0000',
          p50: '187000000.0000',
          p90: '190000000.0000',
        },
      ],
      disclaimer:
        'Synthetic financial simulation for technical demonstration only.',
    }),
    findByUser: vi.fn().mockResolvedValue({
      simulationId: 'df4ee3a2-df76-454e-9627-57fcafda7f8d',
      engineVersion: '1.0.0',
      assumptionSetVersion: 'SYNTHETIC_V1',
      currency: 'KRW',
      goalProbability: 0.71,
      finalValue: {
        p10: '338200000.0000',
        p50: '426300000.0000',
        p90: '548100000.0000',
      },
      series: [
        {
          month: 0,
          p10: '185400000.0000',
          p50: '185400000.0000',
          p90: '185400000.0000',
        },
        {
          month: 1,
          p10: '184000000.0000',
          p50: '187000000.0000',
          p90: '190000000.0000',
        },
      ],
      disclaimer:
        'Synthetic financial simulation for technical demonstration only.',
    }),
  };
  const tradingRepository = {
    quoteInstrument: vi.fn().mockResolvedValue('SYNTH-EQUITY-001'),
    createQuote: vi.fn().mockResolvedValue({
      quoteId: 'd228553f-f10a-47ad-89f6-77be8e034324',
      side: 'BUY',
      quantity: '3.00000000',
      unitPrice: '125000.0000',
      estimatedAmount: '375000.0000',
      fee: '0.0000',
      currency: 'KRW',
      expiresAt: '2026-09-02T00:01:00.000Z',
      syntheticQuote: true,
    }),
    prepareOrder: vi.fn().mockResolvedValue({
      kind: 'prepared',
      value: {
        created: true,
        order: {
          orderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
          status: 'PENDING_SUBMISSION',
          side: 'BUY',
          quantity: '3.00000000',
          estimatedAmount: '375000.0000',
          filledAmount: null,
          createdAt: '2026-09-02T00:00:20.000Z',
          updatedAt: '2026-09-02T00:00:20.000Z',
          statusRefreshRecommendedAfterMs: 2000,
        },
      },
    }),
    submission: vi.fn().mockResolvedValue({
      orderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
      userId: 'user-a',
      clientOrderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
      accountId: 'SYNTH-ACCOUNT-A-001',
      instrumentId: 'SYNTH-EQUITY-001',
      quantity: '3.00000000',
    }),
    applyExternalResult: vi.fn().mockResolvedValue({
      orderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
      status: 'FILLED',
      side: 'BUY',
      quantity: '3.00000000',
      estimatedAmount: '375000.0000',
      filledAmount: '375000.0000',
      createdAt: '2026-09-02T00:00:20.000Z',
      updatedAt: '2026-09-02T00:00:23.000Z',
      statusRefreshRecommendedAfterMs: null,
    }),
    findOrder: vi.fn().mockResolvedValue({
      orderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
      status: 'FILLED',
      side: 'BUY',
      quantity: '3.00000000',
      estimatedAmount: '375000.0000',
      filledAmount: '375000.0000',
      createdAt: '2026-09-02T00:00:20.000Z',
      updatedAt: '2026-09-02T00:00:23.000Z',
      statusRefreshRecommendedAfterMs: null,
    }),
    listOrders: vi.fn().mockResolvedValue({
      items: [
        {
          orderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
          status: 'FILLED',
          side: 'BUY',
          quantity: '3.00000000',
          estimatedAmount: '375000.0000',
          filledAmount: '375000.0000',
          createdAt: '2026-09-02T00:00:20.000Z',
          updatedAt: '2026-09-02T00:00:23.000Z',
          statusRefreshRecommendedAfterMs: null,
        },
      ],
      nextCursor: null,
    }),
  };
  const brokerage = {
    submit: vi.fn().mockResolvedValue({
      clientOrderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
      externalOrderId: 'SIM-23df8759-92ef-45fc-8015-ef891e4e8757',
      status: 'FILLED',
      quantity: '3.00000000',
      unitPrice: '125000.0000',
      filledAmount: '375000.0000',
      executedAt: '2026-09-02T00:00:23.000Z',
    }),
    find: vi.fn(),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  let app: NestFastifyApplication;
  let issuer: string;
  let privateKey: CryptoKey;
  let jwksServer: Server;
  let contract: OpenApiResponseValidator;

  beforeAll(async () => {
    contract = await createOpenApiResponseValidator(
      new URL(
        '../../../../contracts/openapi/platform-v1.yaml',
        import.meta.url,
      ),
    );
    const keyPair = await generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    const publicJwk = await exportJWK(keyPair.publicKey);
    publicJwk.alg = 'RS256';
    publicJwk.kid = 'finapp-test-key';
    publicJwk.use = 'sig';

    jwksServer = createServer((request, response) => {
      if (request.url !== '/jwks') {
        response.writeHead(404).end();
        return;
      }

      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ keys: [publicJwk] }));
    });
    await new Promise<void>((resolve) => {
      jwksServer.listen(0, '127.0.0.1', resolve);
    });
    const address = jwksServer.address();
    if (address === null || typeof address === 'string') {
      throw new Error('JWKS test server did not expose a TCP port.');
    }

    issuer = `http://127.0.0.1:${address.port}/realms/finapp`;
    process.env.OIDC_ISSUER = issuer;
    process.env.OIDC_AUDIENCE = 'finapp-platform-api';
    process.env.OIDC_JWKS_URI = `http://127.0.0.1:${address.port}/jwks`;
    process.env.SIMULATION_PATH_COUNT = '20';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_REPOSITORY)
      .useValue(identityRepository)
      .overrideProvider(MYDATA_REPOSITORY)
      .useValue(myDataRepository)
      .overrideProvider(INSTITUTION_PORT)
      .useValue({ fetchDataset: vi.fn() })
      .overrideProvider(SENSITIVE_DATA_PORT)
      .useValue(sensitiveData)
      .overrideProvider(WEALTH_REPOSITORY)
      .useValue(wealthRepository)
      .overrideProvider(SIMULATION_REPOSITORY)
      .useValue(simulationRepository)
      .overrideProvider(TRADING_REPOSITORY)
      .useValue(tradingRepository)
      .overrideProvider(BROKERAGE_PORT)
      .useValue(brokerage)
      .overrideProvider(MARKET_PRICE_PORT)
      .useValue({ price: vi.fn().mockResolvedValue('125000.0000') })
      .overrideProvider(AuditService)
      .useValue(audit)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) => {
      jwksServer.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_AUDIENCE;
    delete process.env.OIDC_JWKS_URI;
    delete process.env.SIMULATION_PATH_COUNT;
  });

  async function accessToken(options?: {
    audience?: string;
    expiresIn?: string;
    issuer?: string;
    scope?: string;
  }): Promise<string> {
    return new SignJWT({ scope: options?.scope ?? 'financial.read' })
      .setProtectedHeader({ alg: 'RS256', kid: 'finapp-test-key' })
      .setIssuer(options?.issuer ?? issuer)
      .setAudience(options?.audience ?? 'finapp-platform-api')
      .setSubject('synthetic-user-a')
      .setIssuedAt()
      .setExpirationTime(options?.expiresIn ?? '5m')
      .sign(privateKey);
  }

  async function getMe(token?: string) {
    return app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
          'x-request-id': 'identity-request-1',
        },
        method: 'GET',
        url: '/api/v1/me',
      });
  }

  function validateResponse(
    operationId: string,
    response: { readonly statusCode: number; json(): unknown },
  ): void {
    contract.validate(operationId, response.statusCode, response.json());
  }

  it('rejects a request without a Bearer token', async () => {
    const response = await getMe();

    expect(response.statusCode).toBe(401);
    validateResponse('getCurrentUser', response);
    expect(response.json().code).toBe('AUTH_TOKEN_INVALID');
  });

  it('rejects a token with the wrong issuer', async () => {
    const response = await getMe(
      await accessToken({ issuer: 'https://wrong-issuer.example' }),
    );

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('AUTH_TOKEN_INVALID');
  });

  it('rejects a token with the wrong audience', async () => {
    const response = await getMe(await accessToken({ audience: 'wrong-api' }));

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('AUTH_TOKEN_INVALID');
  });

  it('rejects an expired token', async () => {
    const response = await getMe(await accessToken({ expiresIn: '0s' }));

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('AUTH_TOKEN_INVALID');
  });

  it('rejects a valid token without financial.read', async () => {
    const response = await getMe(
      await accessToken({ scope: 'simulation.execute' }),
    );

    expect(response.statusCode).toBe(403);
    validateResponse('getCurrentUser', response);
    expect(response.json().code).toBe('AUTH_SCOPE_MISSING');
  });

  it('maps a verified OIDC subject to the application user', async () => {
    const response = await getMe(await accessToken());

    expect(response.statusCode).toBe(200);
    validateResponse('getCurrentUser', response);
    expect(response.json()).toEqual({
      userId: '4e34157c-f4fa-4f77-aeaf-19ea60ec6806',
      displayName: '테스트 사용자 A',
      riskProfile: 'BALANCED',
      datasetVersion: 'FINANCIAL_APP_DATASET_V1',
      syntheticData: true,
    });
    expect(identityRepository.provisionFromOidc).toHaveBeenCalledWith(
      issuer,
      'synthetic-user-a',
    );
  });

  it('enforces financial.write on connection creation', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { authorization: `Bearer ${await accessToken()}` },
        method: 'POST',
        url: '/api/v1/mydata/connections',
        payload: {
          institutionCode: 'SYNTH_WEALTH_001',
          consentExpiresAt: '2027-09-01T00:00:00.000Z',
        },
      });

    expect(response.statusCode).toBe(403);
    validateResponse('createMyDataConnection', response);
    expect(response.json().code).toBe('AUTH_SCOPE_MISSING');
  });

  it('creates a connection without exposing the external customer identifier', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          authorization: `Bearer ${await accessToken({ scope: 'financial.write' })}`,
        },
        method: 'POST',
        url: '/api/v1/mydata/connections',
        payload: {
          institutionCode: 'SYNTH_WEALTH_001',
          consentExpiresAt: '2027-09-01T00:00:00.000Z',
        },
      });

    expect(response.statusCode).toBe(201);
    validateResponse('createMyDataConnection', response);
    expect(response.body).not.toContain('SYNTH-CUSTOMER-A');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MYDATA_CONNECTION_CREATED' }),
    );
    expect(response.json()).toMatchObject({
      institutionCode: 'SYNTH_WEALTH_001',
      status: 'ACTIVE',
    });
  });

  it('returns the server-authoritative asset summary', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { authorization: `Bearer ${await accessToken()}` },
        method: 'GET',
        url: '/api/v1/assets/summary',
      });

    expect(response.statusCode).toBe(200);
    validateResponse('getAssetSummary', response);
    expect(response.json()).toMatchObject({
      totalAssets: '185400000.0000',
      cash: '15400000.0000',
      investments: '170000000.0000',
    });
  });

  it('enforces simulation.execute and returns a server simulation result', async () => {
    const payload = {
      initialAssets: '185400000.0000',
      monthlyContribution: '1500000.0000',
      durationMonths: 12,
      targetAmount: '220000000.0000',
      allocation: [
        { assetClass: 'CASH', weight: 0.1 },
        { assetClass: 'BOND', weight: 0.3 },
        { assetClass: 'EQUITY', weight: 0.6 },
      ],
    };
    const forbidden = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { authorization: `Bearer ${await accessToken()}` },
        method: 'POST',
        url: '/api/v1/simulations',
        payload,
      });
    expect(forbidden.statusCode).toBe(403);

    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          authorization: `Bearer ${await accessToken({ scope: 'simulation.execute' })}`,
        },
        method: 'POST',
        url: '/api/v1/simulations',
        payload,
      });
    expect(response.statusCode).toBe(201);
    validateResponse('createSimulation', response);
    expect(response.json()).toMatchObject({
      engineVersion: '1.0.0',
      assumptionSetVersion: 'SYNTHETIC_V1',
      goalProbability: 0.71,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SIMULATION_EXECUTED' }),
    );
  });

  it('enforces order.execute and returns a synthetic quote preview', async () => {
    const payload = {
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      side: 'BUY',
      quantity: '3.00000000',
    };
    const forbidden = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: { authorization: `Bearer ${await accessToken()}` },
        method: 'POST',
        url: '/api/v1/orders/preview',
        payload,
      });
    expect(forbidden.statusCode).toBe(403);

    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          authorization: `Bearer ${await accessToken({ scope: 'order.execute' })}`,
        },
        method: 'POST',
        url: '/api/v1/orders/preview',
        payload,
      });
    expect(response.statusCode).toBe(201);
    validateResponse('previewBuyOrder', response);
    expect(response.json()).toMatchObject({
      side: 'BUY',
      quantity: '3.00000000',
      unitPrice: '125000.0000',
      estimatedAmount: '375000.0000',
      syntheticQuote: true,
    });
  });

  it('requires an idempotency key and prepares one cash-reserved order', async () => {
    const payload = {
      quoteId: 'd228553f-f10a-47ad-89f6-77be8e034324',
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      side: 'BUY',
      quantity: '3.00000000',
    };
    const missingKey = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          authorization: `Bearer ${await accessToken({ scope: 'order.execute' })}`,
        },
        method: 'POST',
        url: '/api/v1/orders',
        payload,
      });
    expect(missingKey.statusCode).toBe(400);
    validateResponse('prepareBuyOrder', missingKey);

    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          authorization: `Bearer ${await accessToken({ scope: 'order.execute' })}`,
          'idempotency-key': '90000000-0000-4000-8000-000000000001',
        },
        method: 'POST',
        url: '/api/v1/orders',
        payload,
      });
    expect(response.statusCode).toBe(201);
    validateResponse('prepareBuyOrder', response);
    expect(response.json()).toMatchObject({
      status: 'FILLED',
      filledAmount: '375000.0000',
      quantity: '3.00000000',
      estimatedAmount: '375000.0000',
    });
  });

  it('keeps every current platform operation backed by a Fastify contract response', async () => {
    const token = await accessToken({
      scope: 'financial.read financial.write simulation.execute order.execute',
    });
    const headers = { authorization: `Bearer ${token}` };
    const requests = [
      {
        operationId: 'getPlatformHealth',
        method: 'GET' as const,
        url: '/api/v1/health',
      },
      {
        operationId: 'listMyDataConnections',
        method: 'GET' as const,
        url: '/api/v1/mydata/connections',
        headers,
      },
      {
        operationId: 'createMyDataSync',
        expectedStatus: 202,
        method: 'POST' as const,
        url: '/api/v1/mydata/syncs',
        headers,
        payload: {
          connectionId: '44fc3d1c-cd8f-46ba-833f-96dac39dddfd',
        },
      },
      {
        operationId: 'getMyDataSync',
        method: 'GET' as const,
        url: '/api/v1/mydata/syncs/4467ac44-cf36-449a-b9f9-2b29924a6212',
        headers,
      },
      {
        operationId: 'listAccounts',
        method: 'GET' as const,
        url: '/api/v1/accounts',
        headers,
      },
      {
        operationId: 'getAccount',
        method: 'GET' as const,
        url: '/api/v1/accounts/688c601b-ab70-4683-9dd4-6a1174550653',
        headers,
      },
      {
        operationId: 'listHoldings',
        method: 'GET' as const,
        url: '/api/v1/holdings',
        headers,
      },
      {
        operationId: 'listTransactions',
        method: 'GET' as const,
        url: '/api/v1/transactions',
        headers,
      },
      {
        operationId: 'getAssetHistory',
        method: 'GET' as const,
        url: '/api/v1/assets/history?range=1Y',
        headers,
      },
      {
        operationId: 'getSimulation',
        method: 'GET' as const,
        url: '/api/v1/simulations/df4ee3a2-df76-454e-9627-57fcafda7f8d',
        headers,
      },
      {
        operationId: 'listOrders',
        method: 'GET' as const,
        url: '/api/v1/orders?limit=20',
        headers,
      },
      {
        operationId: 'getOrder',
        method: 'GET' as const,
        url: '/api/v1/orders/23df8759-92ef-45fc-8015-ef891e4e8757',
        headers,
      },
    ];

    for (const request of requests) {
      const response = await app.getHttpAdapter().getInstance().inject(request);
      expect(response.statusCode, request.operationId).toBe(
        'expectedStatus' in request ? request.expectedStatus : 200,
      );
      validateResponse(request.operationId, response);
    }
  });
});
