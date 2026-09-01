import { describe, expect, it } from 'vitest';

import { ContractMockPlatformApi } from './contract-mock-platform-api';

describe('ContractMockPlatformApi', () => {
  it('returns the deterministic platform health fixture', async () => {
    const api = new ContractMockPlatformApi();

    await expect(api.getHealth()).resolves.toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
  });

  it('honors an aborted request', async () => {
    const api = new ContractMockPlatformApi();
    const controller = new AbortController();
    controller.abort();

    await expect(api.getHealth(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
