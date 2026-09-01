import { describe, expect, it } from 'vitest';

import { ContractMockPlatformApi } from './contract-mock-platform-api';

describe('ContractMockPlatformApi', () => {
  it('returns the deterministic platform health fixture', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });

    await expect(api.getHealth()).resolves.toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
  });

  it('honors an aborted request', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 10 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      api.getHealth({ signal: controller.signal }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('models a retryable timeout without changing the response contract', async () => {
    const api = new ContractMockPlatformApi({
      latencyMs: 0,
      scenario: 'timeout',
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    });
  });

  it('models the documented 429 response', async () => {
    const api = new ContractMockPlatformApi({
      latencyMs: 0,
      scenario: 'rate-limited',
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'http',
      retryable: true,
      status: 429,
    });
  });
});
