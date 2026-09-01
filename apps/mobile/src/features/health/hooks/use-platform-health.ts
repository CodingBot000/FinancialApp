import { useQuery } from '@tanstack/react-query';

import { usePlatformApi } from '../../../shared/api';
import { healthQueryOptions } from '../api/health-query';
import { healthErrorDetails, type HealthState } from '../model/health-state';

export function usePlatformHealth() {
  const api = usePlatformApi();
  const query = useQuery(healthQueryOptions(api));
  let state: HealthState = { status: 'loading' };

  if (query.data !== undefined) {
    state = {
      checkedAt: new Date(query.dataUpdatedAt),
      health: query.data,
      status: 'ready',
    };
  } else if (query.error !== null) {
    const details = healthErrorDetails(query.error);
    if (details !== undefined) {
      state = { ...details, status: 'error' };
    }
  }

  return {
    retry: () => {
      void query.refetch();
    },
    state,
  };
}
