import { useCallback, useEffect, useState } from 'react';

import { usePlatformApi } from '../../../shared/api';
import { healthErrorDetails, type HealthState } from '../model/health-state';

export function usePlatformHealth() {
  const api = usePlatformApi();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    void api
      .getHealth({ signal: controller.signal })
      .then((health) => {
        setState({ checkedAt: new Date(), health, status: 'ready' });
      })
      .catch((error: unknown) => {
        const details = healthErrorDetails(error);
        if (details !== undefined) {
          setState({ ...details, status: 'error' });
        }
      });

    return () => {
      controller.abort();
    };
  }, [api, attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { retry, state };
}
