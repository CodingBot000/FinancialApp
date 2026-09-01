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

describe('simulator MyData account API', () => {
  const repository = {
    accounts: vi.fn().mockResolvedValue([
      {
        externalAccountId: 'SYNTH-ACCOUNT-A-001',
        maskedAccountNumber: 'SYNTH-****-0001',
        accountType: 'BROKERAGE',
        currency: 'KRW',
        cashBalance: '15400000.0000',
        status: 'ACTIVE',
      },
    ]),
    holdings: vi.fn().mockResolvedValue([
      {
        externalAccountId: 'SYNTH-ACCOUNT-A-001',
        externalHoldingId: 'SYNTH-HOLDING-A-001',
        instrumentCode: 'SYNTH-EQUITY-001',
        displayName: '가상 성장형 펀드',
        assetClass: 'EQUITY',
        quantity: '1360.00000000',
        averagePrice: '125000.0000',
        asOfAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]),
    transactions: vi.fn().mockResolvedValue([
      {
        externalAccountId: 'SYNTH-ACCOUNT-A-001',
        externalTransactionId: 'SYNTH-TX-A-001',
        transactionType: 'DEPOSIT',
        amount: '1500000.0000',
        currency: 'KRW',
        occurredAt: new Date('2026-08-25T00:00:00.000Z'),
      },
    ]),
  };
  let app: NestFastifyApplication;
  let contract: OpenApiResponseValidator;

  beforeAll(async () => {
    contract = await createOpenApiResponseValidator(
      new URL(
        '../../../../contracts/openapi/institution-simulator-v1.yaml',
        import.meta.url,
      ),
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AccountRepository)
      .useValue(repository)
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

  it.each(['accounts', 'holdings', 'transactions'])(
    'returns deterministic %s through the simulator HTTP boundary',
    async (resource) => {
      const response = await app
        .getHttpAdapter()
        .getInstance()
        .inject({
          method: 'GET',
          url: `/sim/v1/mydata/customers/SYNTH-CUSTOMER-A/${resource}`,
        });

      expect(response.statusCode).toBe(200);
      const operationIds: Record<string, string> = {
        accounts: 'getSimulatorAccounts',
        holdings: 'getSimulatorHoldings',
        transactions: 'getSimulatorTransactions',
      };
      contract.validate(operationIds[resource] ?? '', 200, response.json());
      expect(response.json()).toMatchObject({
        schemaVersion: 'simulator-v1',
        nextCursor: null,
        items: [expect.any(Object)],
      });
    },
  );
});
