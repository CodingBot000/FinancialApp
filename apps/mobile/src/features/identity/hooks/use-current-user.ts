import { useQuery } from '@tanstack/react-query';

import { PlatformApiError, usePlatformApi } from '../../../shared/api';
import { currentUserQueryOptions } from '../api/current-user-query';

export function useCurrentUser() {
  const api = usePlatformApi();
  const query = useQuery(currentUserQueryOptions(api));
  const retry = () => void query.refetch();

  if (query.isPending) {
    return { retry, state: { status: 'loading' } as const };
  }
  if (query.isError) {
    const error = query.error;
    return {
      retry,
      state: {
        message:
          error instanceof PlatformApiError
            ? error.message
            : '현재 사용자 정보를 확인하지 못했습니다.',
        retryable: error instanceof PlatformApiError ? error.retryable : false,
        status: 'error',
      } as const,
    };
  }
  return { retry, state: { status: 'ready', user: query.data } as const };
}
