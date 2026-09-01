import { describe, expect, it } from 'vitest';

import { MemoryAccessTokenStore } from './access-token-store';
import { AuthSessionManager } from './auth-session-manager';
import type { RefreshTokenStore } from './refresh-token-store';

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

describe('AuthSessionManager', () => {
  it('keeps the access token in memory and the refresh token in its secure port', async () => {
    const accessStore = new MemoryAccessTokenStore();
    const refreshStore = new MemoryRefreshTokenStore();
    const manager = new AuthSessionManager(accessStore, refreshStore);

    await manager.establish({
      accessToken: 'example-access-token',
      refreshToken: 'example-refresh-token',
    });

    expect(manager.getAccessToken()).toBe('example-access-token');
    expect(refreshStore.token).toBe('example-refresh-token');
    expect(await manager.hasRefreshSession()).toBe(true);
  });

  it('clears both stores on logout', async () => {
    const accessStore = new MemoryAccessTokenStore();
    const refreshStore = new MemoryRefreshTokenStore();
    const manager = new AuthSessionManager(accessStore, refreshStore);
    await manager.establish({
      accessToken: 'example-access-token',
      refreshToken: 'example-refresh-token',
    });

    await manager.clear();

    expect(manager.getAccessToken()).toBeUndefined();
    expect(refreshStore.token).toBeUndefined();
  });

  it('rejects empty credentials without persisting either token', async () => {
    const accessStore = new MemoryAccessTokenStore();
    const refreshStore = new MemoryRefreshTokenStore();
    const manager = new AuthSessionManager(accessStore, refreshStore);
    const emptyCredential = ' ';

    await expect(
      manager.establish({
        accessToken: emptyCredential,
        refreshToken: 'example-refresh-token',
      }),
    ).rejects.toThrow('access token must not be empty');
    expect(manager.getAccessToken()).toBeUndefined();
    expect(refreshStore.token).toBeUndefined();
  });

  it('removes a corrupt empty refresh credential during boot inspection', async () => {
    const accessStore = new MemoryAccessTokenStore();
    accessStore.write('example-stale-access-token');
    const refreshStore = new MemoryRefreshTokenStore();
    refreshStore.token = ' ';
    const manager = new AuthSessionManager(accessStore, refreshStore);

    await expect(manager.hasRefreshSession()).resolves.toBe(false);
    expect(manager.getAccessToken()).toBeUndefined();
    expect(refreshStore.token).toBeUndefined();
  });
});
