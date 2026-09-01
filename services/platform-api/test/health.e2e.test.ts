import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createOpenApiResponseValidator } from '../../../contracts/testing/openapi-response-validator.mjs';
import { PLATFORM_DATABASE_POOL } from '../src/core/database/database.tokens.js';
import { createFastifyAdapter } from '../src/core/http/create-fastify-adapter.js';
import { HealthModule } from '../src/modules/health/health.module.js';

describe('platform health and observability', () => {
  let app: NestFastifyApplication;
  let contract: Awaited<ReturnType<typeof createOpenApiResponseValidator>>;
  const pool = {
    query: vi.fn().mockResolvedValue({ rows: [{ finapp_readiness: 1 }] }),
    end: vi.fn().mockResolvedValue(undefined),
    totalCount: 2,
    idleCount: 1,
    waitingCount: 0,
  };

  beforeAll(async () => {
    contract = await createOpenApiResponseValidator(
      new URL('../../../contracts/openapi/platform-v1.yaml', import.meta.url),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PLATFORM_DATABASE_POOL)
      .useValue(pool)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('matches getPlatformHealth', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          'x-correlation-id': 'mobile-correlation-1',
          'x-request-id': 'mobile-request-1',
        },
        method: 'GET',
        url: '/api/v1/health',
      });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('mobile-request-1');
    expect(response.headers['x-correlation-id']).toBe('mobile-correlation-1');
    contract.validate('getPlatformHealth', 200, response.json());
  });

  it('probes the database for getPlatformReadiness and returns stable 503', async () => {
    const ready = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/health/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({
      status: 'ready',
      checks: { database: 'up' },
    });
    contract.validate('getPlatformReadiness', 200, ready.json());

    pool.query.mockRejectedValueOnce(new Error('database unavailable'));
    const unavailable = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/health/ready' });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json()).toMatchObject({
      status: 'not_ready',
      checks: { database: 'down' },
    });
    contract.validate('getPlatformReadiness', 503, unavailable.json());
  });

  it('returns bounded getPlatformMetrics counters and pool gauges', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/health/metrics' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: 'platform-api',
      databasePool: { total: 2, idle: 1, waiting: 0 },
      counters: {
        httpRequestsTotal: expect.any(Number),
        externalRequestFailuresTotal: expect.any(Number),
      },
    });
    contract.validate('getPlatformMetrics', 200, response.json());
  });
});
