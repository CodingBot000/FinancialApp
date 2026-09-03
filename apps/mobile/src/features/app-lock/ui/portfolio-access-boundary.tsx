import { useEffect, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { usePortfolioAccess } from '../../../shared/auth/portfolio-access-context';
import {
  DEFAULT_APP_LOCK_TIMEOUT_MS,
  installAppLockLifecycle,
  type AppLockAppStatePort,
  type AppLockClock,
} from '../model/app-lock-lifecycle';
import { BiometricAccessScreen } from './biometric-access-screen';

const systemClock: AppLockClock = { now: Date.now };

export function PortfolioAccessBoundary({
  appState = AppState,
  children,
  clock = systemClock,
  timeoutMs = DEFAULT_APP_LOCK_TIMEOUT_MS,
}: PropsWithChildren<{
  readonly appState?: AppLockAppStatePort;
  readonly clock?: AppLockClock;
  readonly timeoutMs?: number;
}>) {
  const access = usePortfolioAccess();

  useEffect(
    () =>
      installAppLockLifecycle({
        appState,
        clock,
        onTimeout: access.lock,
        timeoutMs,
      }),
    [access.lock, appState, clock, timeoutMs],
  );

  if (access.state.phase === 'unlocked') {
    return children;
  }

  return <BiometricAccessScreen mode="unlock" />;
}
