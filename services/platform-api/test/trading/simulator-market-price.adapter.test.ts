import { createServer, type Server } from 'node:http';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SimulatorMarketPriceAdapter } from '../../src/modules/trading/infrastructure/http/simulator-market-price.adapter.js';

describe('simulator market price HTTP adapter', () => {
  let server: Server;
  let baseUrl: string;
  let mode: 'NORMAL' | 'HTTP_500' | 'MALFORMED' | 'TIMEOUT' = 'NORMAL';

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (
        request.url !== '/sim/v1/market/prices?instrumentIds=SYNTH-EQUITY-001'
      ) {
        response.writeHead(404).end();
        return;
      }
      if (mode === 'TIMEOUT') {
        setTimeout(() => response.end('{}'), 50);
        return;
      }
      if (mode === 'HTTP_500') {
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end('{"code":"SIMULATOR_SCENARIO_HTTP_500"}');
        return;
      }
      response.setHeader('content-type', 'application/json');
      response.end(
        mode === 'MALFORMED'
          ? '{"items":"invalid"}'
          : JSON.stringify({
              schemaVersion: 'simulator-v1',
              items: [
                {
                  instrumentId: 'SYNTH-EQUITY-001',
                  price: '125000.0000',
                  currency: 'KRW',
                  asOfAt: '2026-09-01T00:00:00.000Z',
                },
              ],
            }),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Market test server did not expose a TCP port.');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
    process.env.INSTITUTION_SIMULATOR_BASE_URL = baseUrl;
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = '1000';
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      ),
    );
    delete process.env.INSTITUTION_SIMULATOR_BASE_URL;
    delete process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS;
  });

  it('returns the canonical fixed-decimal price', async () => {
    mode = 'NORMAL';
    await expect(
      new SimulatorMarketPriceAdapter().price('SYNTH-EQUITY-001'),
    ).resolves.toBe('125000.0000');
  });

  it.each(['HTTP_500', 'MALFORMED'] as const)(
    'rejects the %s scenario without creating a quote',
    async (scenario) => {
      mode = scenario;
      await expect(
        new SimulatorMarketPriceAdapter().price('SYNTH-EQUITY-001'),
      ).rejects.toThrow();
    },
  );

  it('enforces the configured timeout', async () => {
    mode = 'TIMEOUT';
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = '10';
    await expect(
      new SimulatorMarketPriceAdapter().price('SYNTH-EQUITY-001'),
    ).rejects.toThrow();
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS = '1000';
  });
});
