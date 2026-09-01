import { describe, expect, it, vi } from 'vitest';

import { MemoryAccessTokenStore } from '../../../shared/auth/access-token-store';
import { AuthSessionManager } from '../../../shared/auth/auth-session-manager';
import type { OidcAuthorizationPort } from '../../../shared/auth/oidc-authorization';
import type { RefreshTokenStore } from '../../../shared/auth/refresh-token-store';
import { OidcLoginService } from './oidc-login-service';

class MemoryRefreshTokenStore implements RefreshTokenStore {
  token: string | undefined;

  async clear() {
    this.token = undefined;
  }

  async read() {
    return this.token;
  }

  async write(token: string) {
    this.token = token;
  }
}

describe('OidcLoginService', () => {
  it('establishes the secure session only after authorization succeeds', async () => {
    const refreshStore = new MemoryRefreshTokenStore();
    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      refreshStore,
    );
    const authorization: OidcAuthorizationPort = {
      authorize: vi.fn().mockResolvedValue({
        status: 'authorized',
        tokens: {
          accessToken: 'example-access-token',
          refreshToken: 'example-refresh-token',
        },
      }),
    };

    await expect(
      new OidcLoginService(authorization, manager).login(),
    ).resolves.toBe('established');
    expect(manager.getAccessToken()).toBe('example-access-token');
    expect(refreshStore.token).toBe('example-refresh-token');
  });

  it('does not create a session when the system browser is cancelled', async () => {
    const refreshStore = new MemoryRefreshTokenStore();
    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      refreshStore,
    );
    const authorization: OidcAuthorizationPort = {
      authorize: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    };

    await expect(
      new OidcLoginService(authorization, manager).login(),
    ).resolves.toBe('cancelled');
    expect(manager.getAccessToken()).toBeUndefined();
    expect(refreshStore.token).toBeUndefined();
  });
});
