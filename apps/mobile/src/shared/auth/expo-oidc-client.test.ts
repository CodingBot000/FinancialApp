import { beforeEach, describe, expect, it, vi } from 'vitest';

const authSession = vi.hoisted(() => {
  const promptAsync = vi.fn();
  const requestConfigs: unknown[] = [];

  class AuthRequest {
    codeVerifier: string | undefined = 'example-code-verifier';

    constructor(config: unknown) {
      requestConfigs.push(config);
    }

    promptAsync = promptAsync;
  }

  return {
    AuthRequest,
    exchangeCodeAsync: vi.fn(),
    fetchDiscoveryAsync: vi.fn(),
    makeRedirectUri: vi.fn(() => 'wealthsandbox://oauth/callback'),
    promptAsync,
    refreshAsync: vi.fn(),
    requestConfigs,
  };
});

vi.mock('expo-auth-session', () => ({
  ...authSession,
  CodeChallengeMethod: { S256: 'S256' },
  ResponseType: { Code: 'code' },
}));

import type { OidcPublicConfig } from '../config';
import { ExpoOidcClient } from './expo-oidc-client';

const config: OidcPublicConfig = {
  clientId: 'wealth-sandbox-mobile',
  issuer: 'https://identity.example/realms/sandbox',
  scopes: ['openid', 'profile', 'offline_access'],
};

describe('ExpoOidcClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.requestConfigs.length = 0;
    authSession.fetchDiscoveryAsync.mockResolvedValue({
      authorizationEndpoint: 'https://identity.example/authorize',
      tokenEndpoint: 'https://identity.example/token',
    });
  });

  it('uses Authorization Code with PKCE S256 and exchanges the verifier', async () => {
    authSession.promptAsync.mockResolvedValue({
      params: { code: 'example-authorization-code' },
      type: 'success',
    });
    authSession.exchangeCodeAsync.mockResolvedValue({
      accessToken: 'example-access-token',
      refreshToken: 'example-refresh-token',
    });

    await expect(new ExpoOidcClient(config).authorize()).resolves.toEqual({
      status: 'authorized',
      tokens: {
        accessToken: 'example-access-token',
        refreshToken: 'example-refresh-token',
      },
    });
    expect(authSession.requestConfigs[0]).toEqual(
      expect.objectContaining({
        clientId: 'wealth-sandbox-mobile',
        codeChallengeMethod: 'S256',
        responseType: 'code',
        usePKCE: true,
      }),
    );
    expect(authSession.exchangeCodeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        extraParams: { code_verifier: 'example-code-verifier' },
        redirectUri: 'wealthsandbox://oauth/callback',
      }),
      expect.any(Object),
    );
  });

  it('returns cancellation without attempting token exchange', async () => {
    authSession.promptAsync.mockResolvedValue({ type: 'cancel' });

    await expect(new ExpoOidcClient(config).authorize()).resolves.toEqual({
      status: 'cancelled',
    });
    expect(authSession.exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('requires an offline refresh credential from the provider', async () => {
    authSession.promptAsync.mockResolvedValue({
      params: { code: 'example-authorization-code' },
      type: 'success',
    });
    authSession.exchangeCodeAsync.mockResolvedValue({
      accessToken: 'example-access-token',
    });

    await expect(new ExpoOidcClient(config).authorize()).rejects.toMatchObject({
      code: 'refresh_token_required',
    });
  });

  it('refreshes through discovery and preserves optional rotation', async () => {
    authSession.refreshAsync.mockResolvedValue({
      accessToken: 'example-next-access-token',
      refreshToken: 'example-next-refresh-token',
    });

    await expect(
      new ExpoOidcClient(config).refresh('example-current-refresh-token'),
    ).resolves.toEqual({
      accessToken: 'example-next-access-token',
      refreshToken: 'example-next-refresh-token',
    });
    expect(authSession.refreshAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'wealth-sandbox-mobile',
        refreshToken: 'example-current-refresh-token',
      }),
      expect.any(Object),
    );
  });
});
