import { describe, expect, it } from 'vitest';

import { createAppLockStore } from './app-lock-store';

describe('app lock store', () => {
  it('unlocks only after a successful local biometric result', () => {
    const store = createAppLockStore();

    expect(store.getState().beginUnlock()).toBe(true);
    expect(store.getState().beginUnlock()).toBe(false);
    store.getState().resolveUnlock({ status: 'authenticated' });

    expect(store.getState()).toMatchObject({
      notice: undefined,
      phase: 'unlocked',
    });
  });

  it('keeps cancellation and retryable failure locked', () => {
    const store = createAppLockStore();
    store.getState().beginUnlock();
    store.getState().resolveUnlock({ status: 'cancelled' });
    expect(store.getState()).toMatchObject({
      notice: 'cancelled',
      phase: 'locked',
    });

    store.getState().beginUnlock();
    store.getState().resolveUnlock({
      reason: 'authentication_failed',
      status: 'retryable-failure',
    });
    expect(store.getState()).toMatchObject({
      notice: 'authentication-failed',
      phase: 'locked',
    });
  });

  it('requires OIDC reauthentication after a device lockout', () => {
    const store = createAppLockStore();
    store.getState().beginUnlock();
    store.getState().resolveUnlock({
      reason: 'locked_out',
      status: 'reauthentication-required',
    });

    expect(store.getState().phase).toBe('reauthentication-required');
  });
});
