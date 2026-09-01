import { describe, expect, it } from 'vitest';

import { PlatformApiError } from '../api';
import { createMobileQueryClient, shouldRetryQuery } from './query-client';

describe('mobile QueryClient', () => {
  it('retries only retryable read failures within the budget', () => {
    const retryable = new PlatformApiError({
      kind: 'network',
      message: 'offline',
      retryable: true,
    });
    const contractFailure = new PlatformApiError({
      kind: 'contract',
      message: 'invalid',
      retryable: false,
    });

    expect(shouldRetryQuery(0, retryable)).toBe(true);
    expect(shouldRetryQuery(2, retryable)).toBe(false);
    expect(shouldRetryQuery(0, contractFailure)).toBe(false);
    expect(shouldRetryQuery(0, new Error('unknown'))).toBe(false);
  });

  it('disables mutation retries by default', () => {
    const client = createMobileQueryClient();

    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
