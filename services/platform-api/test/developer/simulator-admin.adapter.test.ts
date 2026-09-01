import { createServer, type Server } from 'node:http';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SimulatorAdminAdapter } from '../../src/modules/developer/infrastructure/http/simulator-admin.adapter.js';

describe('SimulatorAdminAdapter', () => {
  let server: Server;
  let previousUrl: string | undefined;

  beforeAll(async () => {
    previousUrl = process.env.INSTITUTION_SIMULATOR_BASE_URL;
    server = createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      if (request.url === '/sim/v1/admin/reset' && request.method === 'POST') {
        expect(request.headers['content-type']).toBeUndefined();
        response.end(
          JSON.stringify({
            datasetVersion: 'FINANCIAL_APP_DATASET_V1',
            scenarioMode: 'NORMAL',
            syntheticData: true,
          }),
        );
        return;
      }
      if (
        request.url === '/sim/v1/admin/scenario' &&
        request.method === 'PUT'
      ) {
        expect(request.headers['content-type']).toContain('application/json');
        response.end(JSON.stringify({ mode: 'ORDER_REJECT', scope: 'GLOBAL' }));
        return;
      }
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('no port');
    process.env.INSTITUTION_SIMULATOR_BASE_URL = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousUrl === undefined)
      delete process.env.INSTITUTION_SIMULATOR_BASE_URL;
    else process.env.INSTITUTION_SIMULATOR_BASE_URL = previousUrl;
  });

  it('sets a scenario and sends a bodyless reset POST', async () => {
    const adapter = new SimulatorAdminAdapter();
    await expect(adapter.setScenario('ORDER_REJECT')).resolves.toEqual({
      mode: 'ORDER_REJECT',
      scope: 'GLOBAL',
    });
    await expect(adapter.reset()).resolves.toEqual({
      datasetVersion: 'FINANCIAL_APP_DATASET_V1',
      scenarioMode: 'NORMAL',
      syntheticData: true,
    });
  });
});
