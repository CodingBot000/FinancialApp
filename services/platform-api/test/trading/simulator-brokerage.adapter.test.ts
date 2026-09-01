import { createServer, type RequestListener, type Server } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import type { BrokerageTransportError } from '../../src/modules/trading/application/ports/brokerage.port.js';
import { SimulatorBrokerageAdapter } from '../../src/modules/trading/infrastructure/http/simulator-brokerage.adapter.js';

describe('SimulatorBrokerageAdapter', () => {
  let server: Server | undefined;
  const previousUrl = process.env.INSTITUTION_SIMULATOR_BASE_URL;
  const previousTimeout = process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS;
  const previousThreshold = process.env.EXTERNAL_CIRCUIT_FAILURE_THRESHOLD;
  const previousOpenMilliseconds = process.env.EXTERNAL_CIRCUIT_OPEN_MS;

  afterEach(async () => {
    if (server !== undefined) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = undefined;
    }
    if (previousUrl === undefined)
      delete process.env.INSTITUTION_SIMULATOR_BASE_URL;
    else process.env.INSTITUTION_SIMULATOR_BASE_URL = previousUrl;
    if (previousTimeout === undefined)
      delete process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS;
    else process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = previousTimeout;
    if (previousThreshold === undefined)
      delete process.env.EXTERNAL_CIRCUIT_FAILURE_THRESHOLD;
    else process.env.EXTERNAL_CIRCUIT_FAILURE_THRESHOLD = previousThreshold;
    if (previousOpenMilliseconds === undefined)
      delete process.env.EXTERNAL_CIRCUIT_OPEN_MS;
    else process.env.EXTERNAL_CIRCUIT_OPEN_MS = previousOpenMilliseconds;
  });

  async function listen(handler: RequestListener) {
    server = createServer(handler);
    await new Promise<void>((resolve) =>
      server?.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('no port');
    process.env.INSTITUTION_SIMULATOR_BASE_URL = `http://127.0.0.1:${address.port}`;
  }

  it('submits once and parses a strict FILLED response', async () => {
    let requests = 0;
    await listen((request, response) => {
      requests += 1;
      expect(request.method).toBe('POST');
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          clientOrderId: '90000000-0000-4000-8000-000000000001',
          externalOrderId: 'SIM-1',
          status: 'FILLED',
          quantity: '2.00000000',
          unitPrice: '125000.0000',
          filledAmount: '250000.0000',
          executedAt: '2026-09-02T00:00:00.000Z',
        }),
      );
    });
    const result = await new SimulatorBrokerageAdapter().submit({
      clientOrderId: '90000000-0000-4000-8000-000000000001',
      accountId: 'SYNTH-ACCOUNT-A-001',
      instrumentId: 'SYNTH-EQUITY-001',
      quantity: '2.00000000',
    });
    expect(result.status).toBe('FILLED');
    expect(requests).toBe(1);
  });

  it.each([
    ['HTTP_ERROR', 500, { code: 'failure' }],
    ['INVALID_RESPONSE', 200, { malformed: true }],
  ] as const)('maps %s without retry', async (code, statusCode, body) => {
    let requests = 0;
    await listen((_request, response) => {
      requests += 1;
      response.statusCode = statusCode;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(body));
    });
    await expect(
      new SimulatorBrokerageAdapter().find(
        '90000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toMatchObject({
      code,
    } satisfies Partial<BrokerageTransportError>);
    expect(requests).toBe(1);
  });

  it('times out without retrying the order POST', async () => {
    let requests = 0;
    await listen(() => {
      requests += 1;
    });
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = '10';
    await expect(
      new SimulatorBrokerageAdapter().submit({
        clientOrderId: '90000000-0000-4000-8000-000000000001',
        accountId: 'SYNTH-ACCOUNT-A-001',
        instrumentId: 'SYNTH-EQUITY-001',
        quantity: '2.00000000',
      }),
    ).rejects.toMatchObject({
      code: 'TIMEOUT',
    } satisfies Partial<BrokerageTransportError>);
    expect(requests).toBe(1);
  });

  it('opens before a later order POST and never retries that POST', async () => {
    let requests = 0;
    await listen((_request, response) => {
      requests += 1;
      response.writeHead(500).end();
    });
    process.env.EXTERNAL_CIRCUIT_FAILURE_THRESHOLD = '2';
    process.env.EXTERNAL_CIRCUIT_OPEN_MS = '1000';
    const adapter = new SimulatorBrokerageAdapter();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(adapter.find(`synthetic-${attempt}`)).rejects.toMatchObject({
        code: 'HTTP_ERROR',
      });
    }
    await expect(
      adapter.submit({
        clientOrderId: '90000000-0000-4000-8000-000000000002',
        accountId: 'SYNTH-ACCOUNT-A-001',
        instrumentId: 'SYNTH-EQUITY-001',
        quantity: '2.00000000',
      }),
    ).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    expect(requests).toBe(2);
  });
});
