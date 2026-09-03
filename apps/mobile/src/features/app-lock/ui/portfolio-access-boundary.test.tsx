import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import type { BiometricGateResult } from '../../../shared/auth/biometric-gate';
import { PortfolioAccessProvider } from '../../../shared/auth/portfolio-access-context';
import type { AppLockAppStatePort } from '../model/app-lock-lifecycle';
import { PortfolioAccessBoundary } from './portfolio-access-boundary';

function createAppState(): AppLockAppStatePort & {
  emit(next: 'active' | 'background'): void;
} {
  let listener: ((state: 'active' | 'background') => void) | undefined;
  let currentState: 'active' | 'background' = 'active';
  return {
    get currentState() {
      return currentState;
    },
    addEventListener(_, nextListener) {
      listener = nextListener as (state: 'active' | 'background') => void;
      return { remove: () => (listener = undefined) };
    },
    emit(next) {
      currentState = next;
      listener?.(next);
    },
  };
}

describe('PortfolioAccessBoundary', () => {
  it('requires another biometric result after the background timeout', async () => {
    let now = 0;
    let finishSecond: ((result: BiometricGateResult) => void) | undefined;
    const authenticate = vi
      .fn()
      .mockResolvedValueOnce({ status: 'authenticated' })
      .mockImplementationOnce(
        () =>
          new Promise<BiometricGateResult>((resolve) => {
            finishSecond = resolve;
          }),
      );
    const appState = createAppState();
    const view = await render(
      <PortfolioAccessProvider biometricGate={{ authenticate }}>
        <PortfolioAccessBoundary
          appState={appState}
          clock={{ now: () => now }}
          timeoutMs={60_000}
        >
          <Text>보호된 홈</Text>
        </PortfolioAccessBoundary>
      </PortfolioAccessProvider>,
    );

    expect(await view.findByText('보호된 홈')).toBeTruthy();
    await act(async () => appState.emit('background'));
    now = 60_001;
    await act(async () => appState.emit('active'));

    await vi.waitFor(() => expect(authenticate).toHaveBeenCalledTimes(2));
    expect(view.queryByText('보호된 홈')).toBeNull();

    await act(async () => finishSecond?.({ status: 'authenticated' }));
    expect(await view.findByText('보호된 홈')).toBeTruthy();
  });
});
