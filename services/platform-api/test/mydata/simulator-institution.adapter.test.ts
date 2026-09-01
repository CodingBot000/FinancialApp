import { createServer, type Server } from 'node:http';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SimulatorInstitutionAdapter } from '../../src/modules/mydata/infrastructure/http/simulator-institution.adapter.js';

type Mode = 'NORMAL' | 'HTTP_500' | 'MALFORMED' | 'TIMEOUT';

describe('simulator institution HTTP adapter', () => {
  let mode: Mode = 'NORMAL';
  let server: Server;
  const adapter = new SimulatorInstitutionAdapter();

  beforeAll(async () => {
    server = createServer((request, response) => {
      const send = () => {
        if (mode === 'HTTP_500') {
          response.writeHead(500).end();
          return;
        }
        response.setHeader('content-type', 'application/json');
        response.setHeader('x-request-id', 'simulator-request-id');
        if (mode === 'MALFORMED') {
          response.end(JSON.stringify({ items: 'not-an-array' }));
          return;
        }
        const common = { schemaVersion: 'simulator-v1', nextCursor: null };
        if (request.url?.endsWith('/accounts') === true) {
          response.end(
            JSON.stringify({
              ...common,
              items: [
                {
                  externalAccountId: 'SYNTH-ACCOUNT-A-001',
                  maskedAccountNumber: 'SYNTH-****-0001',
                  accountType: 'BROKERAGE',
                  currency: 'KRW',
                  cashBalance: '15400000.0000',
                  status: 'ACTIVE',
                },
              ],
            }),
          );
          return;
        }
        if (request.url?.endsWith('/holdings') === true) {
          response.end(
            JSON.stringify({
              ...common,
              items: [
                {
                  externalAccountId: 'SYNTH-ACCOUNT-A-001',
                  externalHoldingId: 'SYNTH-HOLDING-A-001',
                  instrumentCode: 'SYNTH-EQUITY-001',
                  displayName: '가상 성장형 펀드',
                  assetClass: 'EQUITY',
                  quantity: '1360.00000000',
                  averagePrice: '125000.0000',
                  asOfAt: '2026-09-01T00:00:00.000Z',
                },
              ],
            }),
          );
          return;
        }
        response.end(
          JSON.stringify({
            ...common,
            items: [
              {
                externalAccountId: 'SYNTH-ACCOUNT-A-001',
                externalTransactionId: 'SYNTH-TX-A-001',
                transactionType: 'DEPOSIT',
                amount: '1500000.0000',
                currency: 'KRW',
                occurredAt: '2026-08-25T00:00:00.000Z',
              },
            ],
          }),
        );
      };
      if (mode === 'TIMEOUT') {
        setTimeout(send, 100);
      } else {
        send();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Simulator test server did not expose a TCP port.');
    }
    process.env.INSTITUTION_SIMULATOR_BASE_URL = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    mode = 'NORMAL';
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = '1000';
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
    delete process.env.INSTITUTION_SIMULATOR_BASE_URL;
    delete process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS;
  });

  it('validates all three normal simulator resources', async () => {
    const result = await adapter.fetchDataset('SYNTH-CUSTOMER-A');
    expect(result.accounts.items).toHaveLength(1);
    expect(result.holdings.items).toHaveLength(1);
    expect(result.transactions.items).toHaveLength(1);
    expect(result.accounts.requestId).toBe('simulator-request-id');
  });

  it('rejects an institution HTTP 500', async () => {
    mode = 'HTTP_500';
    await expect(adapter.fetchDataset('SYNTH-CUSTOMER-A')).rejects.toThrow(
      'HTTP 500',
    );
  });

  it('rejects a malformed institution response', async () => {
    mode = 'MALFORMED';
    await expect(adapter.fetchDataset('SYNTH-CUSTOMER-A')).rejects.toThrow(
      'envelope is invalid',
    );
  });

  it('enforces the institution timeout', async () => {
    mode = 'TIMEOUT';
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = '10';
    await expect(
      adapter.fetchDataset('SYNTH-CUSTOMER-A'),
    ).rejects.toBeDefined();
  });
});
