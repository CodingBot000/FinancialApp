import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => ({
  ...secureStore,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

import { ExpoSecureRefreshTokenStore } from './expo-secure-refresh-token-store';
import { SessionPersistenceError } from './session-errors';

describe('ExpoSecureRefreshTokenStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores only the refresh token with device-bound keychain accessibility', async () => {
    const store = new ExpoSecureRefreshTokenStore();

    await store.write('refresh-secret');

    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'financialapp.auth.refresh-token.v1',
      'refresh-secret',
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
    );
  });

  it('normalizes an absent secure value to undefined', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);
    const store = new ExpoSecureRefreshTokenStore();

    await expect(store.read()).resolves.toBeUndefined();
  });

  it('does not expose credential values when secure persistence fails', async () => {
    secureStore.setItemAsync.mockRejectedValue(new Error('native failure'));
    const store = new ExpoSecureRefreshTokenStore();

    const failure = await store
      .write('do-not-leak')
      .catch((error: unknown) =>
        error instanceof Error ? error : new Error('unexpected failure'),
      );

    expect(failure).toBeInstanceOf(SessionPersistenceError);
    if (!(failure instanceof Error)) {
      throw new TypeError('Expected secure persistence to fail');
    }
    expect(failure.message).not.toContain('do-not-leak');
  });
});
