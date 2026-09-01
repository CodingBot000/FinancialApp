import { QueryClient } from '@tanstack/react-query';

import { PlatformApiError } from '../api';

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return (
    failureCount < 2 && error instanceof PlatformApiError && error.retryable
  );
}

export function createMobileQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        gcTime: 5 * 60 * 1000,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        staleTime: 30 * 1000,
      },
    },
  });
}
