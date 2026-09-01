import type { AppStateStatus } from 'react-native';

export const DEFAULT_APP_LOCK_TIMEOUT_MS = 60_000;

export interface AppLockClock {
  now(): number;
}

export interface AppLockAppStatePort {
  readonly currentState: AppStateStatus;
  addEventListener(
    type: 'change',
    listener: (state: AppStateStatus) => void,
  ): { remove(): void };
}

export function installAppLockLifecycle({
  appState,
  clock,
  onTimeout,
  timeoutMs,
}: {
  readonly appState: AppLockAppStatePort;
  readonly clock: AppLockClock;
  readonly onTimeout: () => void;
  readonly timeoutMs: number;
}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError('App lock timeout must be a non-negative number');
  }

  let previousState = appState.currentState;
  let backgroundStartedAt =
    previousState === 'active' ? undefined : clock.now();

  const subscription = appState.addEventListener('change', (nextState) => {
    if (previousState === 'active' && nextState !== 'active') {
      backgroundStartedAt = clock.now();
    }

    if (
      nextState === 'active' &&
      previousState !== 'active' &&
      backgroundStartedAt !== undefined &&
      clock.now() - backgroundStartedAt >= timeoutMs
    ) {
      onTimeout();
    }

    previousState = nextState;
  });

  return () => subscription.remove();
}
