import { describe, expect, it } from 'vitest';

import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { healthQueryKey, healthQueryOptions } from './health-query';

describe('healthQueryOptions', () => {
  it('stores the canonical mock response in the server-state cache', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const queryClient = createMobileQueryClient();

    await expect(
      queryClient.fetchQuery(healthQueryOptions(api)),
    ).resolves.toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
    expect(queryClient.getQueryData(healthQueryKey)).toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
  });
});
