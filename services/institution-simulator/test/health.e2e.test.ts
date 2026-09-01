import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createOpenApiResponseValidator,
  type OpenApiResponseValidator,
} from '../../../contracts/testing/openapi-response-validator.mjs';
import { AppModule } from '../src/app.module.js';
import { createFastifyAdapter } from '../src/core/http/create-fastify-adapter.js';

describe('institution simulator health', () => {
  let app: NestFastifyApplication;
  let contract: OpenApiResponseValidator;

  beforeAll(async () => {
    contract = await createOpenApiResponseValidator(
      new URL(
        '../../../contracts/openapi/institution-simulator-v1.yaml',
        import.meta.url,
      ),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('matches the internal simulator health contract', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        headers: {
          'x-correlation-id': 'platform-correlation-1',
          'x-request-id': 'platform-request-1',
        },
        method: 'GET',
        url: '/sim/v1/health',
      });

    expect(response.statusCode).toBe(200);
    contract.validate(
      'getInstitutionSimulatorHealth',
      response.statusCode,
      response.json(),
    );
    expect(response.headers['x-request-id']).toBe('platform-request-1');
    expect(response.headers['x-correlation-id']).toBe('platform-correlation-1');
    expect(response.json()).toEqual({
      datasetVersion: 'baseline-v1',
      service: 'institution-simulator',
      status: 'ok',
    });
  });
});
