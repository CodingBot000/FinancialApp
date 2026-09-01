import { describe, expect, it, vi } from 'vitest';

import { MemoryAccessTokenStore } from '../auth/access-token-store';
import { AuthSessionManager } from '../auth/auth-session-manager';
import type { RefreshTokenStore } from '../auth/refresh-token-store';
import { AuthenticatedFetch } from './authenticated-fetch';

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

async function createSession() {
  const manager = new AuthSessionManager(
    new MemoryAccessTokenStore(),
    new MemoryRefreshTokenStore(),
  );
  await manager.establish({
    accessToken: 'example-stale-access-token',
    refreshToken: 'example-refresh-token',
  });
  const refresh = vi.fn().mockResolvedValue({
    accessToken: 'example-fresh-access-token',
  });
  return {
    manager,
    refresh,
    refreshCoordinator: manager.createRefreshCoordinator({ refresh }),
  };
}

function authorizationHeader(init: RequestInit | undefined) {
  return new Headers(init?.headers).get('Authorization');
}

describe('AuthenticatedFetch', () => {
  it('shares one refresh for concurrent 401 responses and replays GET once', async () => {
    const { manager, refresh, refreshCoordinator } = await createSession();
    let staleRequests = 0;
    const fetch = vi.fn(async (_input: string, init?: RequestInit) => {
      const authorized =
        authorizationHeader(init) === 'Bearer example-fresh-access-token';
      if (!authorized) {
        staleRequests += 1;
        if (staleRequests === 2) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      return new Response(undefined, { status: authorized ? 204 : 401 });
    });
    const client = new AuthenticatedFetch(manager, refreshCoordinator, fetch);

    const responses = await Promise.all([
      client.request('https://api.example/api/v1/resource'),
      client.request('https://api.example/api/v1/resource'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not automatically replay a mutation after its 401', async () => {
    const { manager, refresh, refreshCoordinator } = await createSession();
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(undefined, { status: 401 }));
    const client = new AuthenticatedFetch(manager, refreshCoordinator, fetch);

    const response = await client.request(
      'https://api.example/api/v1/resource',
      { body: '{}', method: 'POST' },
    );

    expect(response.status).toBe(401);
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('fails closed and clears the session after a replayed GET is still unauthorized', async () => {
    const { manager, refreshCoordinator } = await createSession();
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(undefined, { status: 401 }));
    const client = new AuthenticatedFetch(manager, refreshCoordinator, fetch);

    await expect(
      client.request('https://api.example/api/v1/resource'),
    ).rejects.toThrow(
      'The local session expired and requires OIDC reauthentication.',
    );
    expect(manager.getSessionPresence()).toBe('absent');
    expect(manager.getAccessToken()).toBeUndefined();
  });

  it('publishes an absent session when refresh fails', async () => {
    const { manager, refresh, refreshCoordinator } = await createSession();
    refresh.mockRejectedValue(new Error('example-refresh-failure'));
    const client = new AuthenticatedFetch(
      manager,
      refreshCoordinator,
      vi.fn().mockResolvedValue(new Response(undefined, { status: 401 })),
    );

    await expect(
      client.request('https://api.example/api/v1/resource'),
    ).rejects.toThrow(
      'The local session expired and requires OIDC reauthentication.',
    );
    expect(manager.getSessionPresence()).toBe('absent');
  });
});
