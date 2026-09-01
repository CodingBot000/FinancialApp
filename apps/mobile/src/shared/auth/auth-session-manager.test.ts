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
    expect(manager.getSessionPresence()).toBe('active');
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
    expect(manager.getSessionPresence()).toBe('absent');
  });

  it('publishes only actual session-presence transitions', async () => {
    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      new MemoryRefreshTokenStore(),
    );
    const states: string[] = [];
    const unsubscribe = manager.subscribeToSessionPresence(() => {
      states.push(manager.getSessionPresence());
    });

    await manager.hasRefreshSession();
    await manager.hasRefreshSession();
    await manager.establish({
      accessToken: 'example-access-token',
      refreshToken: 'example-refresh-token',
    });
    unsubscribe();
    await manager.clear();

    expect(states).toEqual(['absent', 'active']);
  });

  it('keeps protected content unavailable when secure session inspection fails', async () => {
    const failingRefreshStore: RefreshTokenStore = {
      clear: async () => undefined,
      read: async () => {
        throw new Error('example-storage-failure');
      },
      write: async () => undefined,
    };
    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      failingRefreshStore,
    );

    await expect(manager.inspectSessionPresence()).resolves.toBe('unavailable');
    expect(manager.getSessionPresence()).toBe('unavailable');
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
