import 'reflect-metadata';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createOpenApiResponseValidator } from '../../../../contracts/testing/openapi-response-validator.mjs';
import { createFastifyAdapter } from '../../src/core/http/create-fastify-adapter.js';
import { DeveloperModule } from '../../src/modules/developer/developer.module.js';
import { SIMULATOR_ADMIN_PORT } from '../../src/modules/developer/application/ports/simulator-admin.port.js';
import { AuditService } from '../../src/modules/audit/audit.service.js';

describe('developer scenario boundary', () => {
  let app: NestFastifyApplication;
  let previousEnvironment: string | undefined;
  let contract: Awaited<ReturnType<typeof createOpenApiResponseValidator>>;
  const auditRecord = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    previousEnvironment = process.env.APP_ENV;
    process.env.APP_ENV = 'local';
    contract = await createOpenApiResponseValidator(
      new URL(
        '../../../../contracts/openapi/platform-v1.yaml',
        import.meta.url,
      ),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [DeveloperModule],
    })
      .overrideProvider(SIMULATOR_ADMIN_PORT)
      .useValue({
        setScenario: vi.fn().mockImplementation((mode: string) => ({
          mode,
          scope: 'GLOBAL',
        })),
        reset: vi.fn().mockResolvedValue({
          datasetVersion: 'FINANCIAL_APP_DATASET_V1',
          scenarioMode: 'NORMAL',
          syntheticData: true,
        }),
      })
      .overrideProvider(AuditService)
      .useValue({ record: auditRecord })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    if (previousEnvironment === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = previousEnvironment;
  });

  it('setDeveloperScenario validates and proxies the local scenario', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'PUT',
        url: '/api/v1/dev/scenario',
        headers: { 'x-correlation-id': 'developer-test-trace' },
        payload: {
          mode: 'ORDER_UNKNOWN_THEN_FILLED',
          correlationScope: 'CURRENT_USER',
        },
      });
    expect(response.statusCode).toBe(200);
    contract.validate('setDeveloperScenario', 200, response.json());
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DEV_SCENARIO_CHANGED',
        traceId: 'developer-test-trace',
      }),
    );

    const invalid = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'PUT',
        url: '/api/v1/dev/scenario',
        payload: { mode: 'UNSAFE' },
      });
    expect(invalid.statusCode).toBe(400);
    contract.validate('setDeveloperScenario', 400, invalid.json());
  });

  it('resetDeveloperDataset restores the deterministic local baseline', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/api/v1/dev/dataset/reset',
        headers: { 'x-correlation-id': 'developer-reset-trace' },
      });
    expect(response.statusCode).toBe(200);
    contract.validate('resetDeveloperDataset', 200, response.json());
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DEV_SCENARIO_CHANGED',
        traceId: 'developer-reset-trace',
      }),
    );
  });

  it('does not register the developer module in production', async () => {
    process.env.APP_ENV = 'production';
    vi.resetModules();
    const { AppModule } = await import('../../src/app.module.js');
    const imports = Reflect.getMetadata('imports', AppModule) as
      readonly { name?: string }[] | undefined;
    expect(imports?.map((item) => item.name)).not.toContain('DeveloperModule');
    process.env.APP_ENV = 'local';
  });
});
