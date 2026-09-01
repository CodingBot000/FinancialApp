import { createStore, type StoreApi } from 'zustand/vanilla';

import type { BiometricGateResult } from '../../../shared/auth';

export type AppLockPhase =
  'locked' | 'unlocking' | 'unlocked' | 'reauthentication-required';

export type AppLockNotice = 'authentication-failed' | 'cancelled' | 'timed-out';

export interface AppLockState {
  readonly notice: AppLockNotice | undefined;
  readonly phase: AppLockPhase;
  beginUnlock(): boolean;
  lock(): void;
  resolveUnlock(result: BiometricGateResult): void;
}

export type AppLockStore = StoreApi<AppLockState>;

export function createAppLockStore(): AppLockStore {
  return createStore<AppLockState>((set, get) => ({
    notice: undefined,
    phase: 'locked',
    beginUnlock: () => {
      if (get().phase !== 'locked') {
        return false;
      }
      set({ notice: undefined, phase: 'unlocking' });
      return true;
    },
    lock: () => set({ notice: undefined, phase: 'locked' }),
    resolveUnlock: (result) => {
      switch (result.status) {
        case 'authenticated':
          set({ notice: undefined, phase: 'unlocked' });
          return;
        case 'cancelled':
          set({ notice: 'cancelled', phase: 'locked' });
          return;
        case 'retryable-failure':
          set({
            notice:
              result.reason === 'timeout'
                ? 'timed-out'
                : 'authentication-failed',
            phase: 'locked',
          });
          return;
        case 'reauthentication-required':
          set({ notice: undefined, phase: 'reauthentication-required' });
      }
    },
  }));
}
