import { queryOptions } from '@tanstack/react-query';

import type { PlatformApi } from '../../../shared/api';

export const healthQueryKey = ['platform-health'] as const;

export function healthQueryOptions(api: PlatformApi) {
  return queryOptions({
    queryFn: ({ signal }) => api.getHealth({ signal }),
    queryKey: healthQueryKey,
  });
}
