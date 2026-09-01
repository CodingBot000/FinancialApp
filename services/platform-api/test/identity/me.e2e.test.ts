import { createServer, type Server } from 'node:http';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { createFastifyAdapter } from '../../src/core/http/create-fastify-adapter.js';
import { IDENTITY_REPOSITORY } from '../../src/modules/identity/application/ports/identity-repository.port.js';
import { INSTITUTION_PORT } from '../../src/modules/mydata/application/ports/institution.port.js';
import { MYDATA_REPOSITORY } from '../../src/modules/mydata/application/ports/mydata-repository.port.js';
import { SENSITIVE_DATA_PORT } from '../../src/modules/mydata/application/ports/sensitive-data.port.js';
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
    createSync: vi.fn(),
    getSync: vi.fn(),
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
    accounts: vi.fn(),
    account: vi.fn(),
    holdings: vi.fn(),
    transactions: vi.fn(),
    history: vi.fn(),
  };
  let app: NestFastifyApplication;
  let issuer: string;
  let privateKey: CryptoKey;
  let jwksServer: Server;

  beforeAll(async () => {
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

  it('rejects a request without a Bearer token', async () => {
    const response = await getMe();

    expect(response.statusCode).toBe(401);
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
    expect(response.json().code).toBe('AUTH_SCOPE_MISSING');
  });

  it('maps a verified OIDC subject to the application user', async () => {
    const response = await getMe(await accessToken());

    expect(response.statusCode).toBe(200);
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
    expect(response.body).not.toContain('SYNTH-CUSTOMER-A');
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
    expect(response.json()).toMatchObject({
      totalAssets: '185400000.0000',
      cash: '15400000.0000',
      investments: '170000000.0000',
    });
  });
});
