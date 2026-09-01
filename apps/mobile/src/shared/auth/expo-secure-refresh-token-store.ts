import * as SecureStore from 'expo-secure-store';

import { requireToken, SessionPersistenceError } from './session-errors';
import type { RefreshTokenStore } from './refresh-token-store';

const REFRESH_TOKEN_KEY = 'financialapp.auth.refresh-token.v1';
const SECURE_STORE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

export class ExpoSecureRefreshTokenStore implements RefreshTokenStore {
  async clear() {
    try {
      await SecureStore.deleteItemAsync(
        REFRESH_TOKEN_KEY,
        SECURE_STORE_OPTIONS,
      );
    } catch (cause) {
      throw new SessionPersistenceError({ cause });
    }
  }

  async read() {
    try {
      return (
        (await SecureStore.getItemAsync(
          REFRESH_TOKEN_KEY,
          SECURE_STORE_OPTIONS,
        )) ?? undefined
      );
    } catch (cause) {
      throw new SessionPersistenceError({ cause });
    }
  }

  async write(token: string) {
    const validToken = requireToken(token, 'refresh');

    try {
      await SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        validToken,
        SECURE_STORE_OPTIONS,
      );
    } catch (cause) {
      throw new SessionPersistenceError({ cause });
    }
  }
}
