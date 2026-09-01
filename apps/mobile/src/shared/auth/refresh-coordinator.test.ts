import { describe, expect, it, vi } from 'vitest';

import { MemoryAccessTokenStore } from './access-token-store';
import { RefreshCoordinator } from './refresh-coordinator';
import type { RefreshTokenStore } from './refresh-token-store';
import { SessionExpiredError } from './session-errors';

class MemoryRefreshTokenStore implements RefreshTokenStore {
  clearCount = 0;

  constructor(public token: string | undefined) {}

  async clear() {
    this.clearCount += 1;
    this.token = undefined;
  }

  async read() {
    return this.token;
  }

  async write(token: string) {
    this.token = token;
  }
}

describe('RefreshCoordinator', () => {
  it('coalesces concurrent refreshes and rotates credentials once', async () => {
    const accessStore = new MemoryAccessTokenStore();
    const refreshStore = new MemoryRefreshTokenStore('refresh-old');
    let releaseRefresh: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const refresh = vi.fn(async () => {
      await gate;
      return {
        accessToken: 'example-new-access-token',
        refreshToken: 'example-new-refresh-token',
      };
    });
    const coordinator = new RefreshCoordinator(accessStore, refreshStore, {
      refresh,
    });

    const first = coordinator.refreshAccessToken();
    const second = coordinator.refreshAccessToken();
    const third = coordinator.refreshAccessToken();
    releaseRefresh?.();

    await expect(Promise.all([first, second, third])).resolves.toEqual([
      'example-new-access-token',
      'example-new-access-token',
      'example-new-access-token',
    ]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledWith('refresh-old');
    expect(accessStore.read()).toBe('example-new-access-token');
    expect(refreshStore.token).toBe('example-new-refresh-token');
  });

  it('clears local credentials when refresh fails', async () => {
    const accessStore = new MemoryAccessTokenStore();
    accessStore.write('example-expired-access-token');
    const refreshStore = new MemoryRefreshTokenStore('refresh-expired');
    const coordinator = new RefreshCoordinator(accessStore, refreshStore, {
      refresh: vi.fn().mockRejectedValue(new Error('provider unavailable')),
    });

    await expect(coordinator.refreshAccessToken()).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(accessStore.read()).toBeUndefined();
    expect(refreshStore.token).toBeUndefined();
    expect(refreshStore.clearCount).toBe(1);
  });

  it('requires reauthentication without calling the provider when no refresh token exists', async () => {
    const accessStore = new MemoryAccessTokenStore();
    const refreshStore = new MemoryRefreshTokenStore(undefined);
    const refresh = vi.fn();
    const coordinator = new RefreshCoordinator(accessStore, refreshStore, {
      refresh,
    });

    await expect(coordinator.refreshAccessToken()).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
