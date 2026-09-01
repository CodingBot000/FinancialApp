import { queryOptions } from '@tanstack/react-query';

import type { PlatformApi } from '../../../shared/api';

export const currentUserQueryKey = ['current-user'] as const;

export function currentUserQueryOptions(api: PlatformApi) {
  return queryOptions({
    queryFn: ({ signal }) => api.getCurrentUser({ signal }),
    queryKey: currentUserQueryKey,
  });
}
