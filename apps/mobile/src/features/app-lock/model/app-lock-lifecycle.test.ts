import type { AppStateStatus } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  installAppLockLifecycle,
  type AppLockAppStatePort,
} from './app-lock-lifecycle';

class TestAppState implements AppLockAppStatePort {
  currentState: AppStateStatus = 'active';
  private listener: ((state: AppStateStatus) => void) | undefined;

  addEventListener(_type: 'change', listener: (state: AppStateStatus) => void) {
    this.listener = listener;
    return { remove: () => (this.listener = undefined) };
  }

  moveTo(state: AppStateStatus) {
    this.currentState = state;
    this.listener?.(state);
  }
}

describe('app lock lifecycle', () => {
  it('locks after the configured background timeout', () => {
    const appState = new TestAppState();
    let now = 1_000;
    const onTimeout = vi.fn();
    installAppLockLifecycle({
      appState,
      clock: { now: () => now },
      onTimeout,
      timeoutMs: 60_000,
    });

    appState.moveTo('inactive');
    now += 60_000;
    appState.moveTo('active');

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it('does not reset the departure time during inactive-to-background', () => {
    const appState = new TestAppState();
    let now = 1_000;
    const onTimeout = vi.fn();
    installAppLockLifecycle({
      appState,
      clock: { now: () => now },
      onTimeout,
      timeoutMs: 60_000,
    });

    appState.moveTo('inactive');
    now += 40_000;
    appState.moveTo('background');
    now += 20_000;
    appState.moveTo('active');

    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it('keeps the app unlocked for a short interruption and removes listeners', () => {
    const appState = new TestAppState();
    let now = 1_000;
    const onTimeout = vi.fn();
    const cleanup = installAppLockLifecycle({
      appState,
      clock: { now: () => now },
      onTimeout,
      timeoutMs: 60_000,
    });

    appState.moveTo('background');
    now += 59_999;
    appState.moveTo('active');
    cleanup();
    appState.moveTo('background');
    now += 60_000;
    appState.moveTo('active');

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
