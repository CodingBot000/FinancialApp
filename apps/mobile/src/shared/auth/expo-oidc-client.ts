import * as AuthSession from 'expo-auth-session';

import {
  OIDC_REDIRECT_PATH,
  OIDC_REDIRECT_SCHEME,
  type OidcPublicConfig,
} from '../config';
import type {
  OidcAuthorizationPort,
  OidcAuthorizationResult,
} from './oidc-authorization';
import { OidcAuthorizationError } from './oidc-authorization';
import type { RefreshedTokens, TokenRefreshPort } from './refresh-coordinator';
import { requireToken } from './session-errors';

function authorizationError(
  code: ConstructorParameters<typeof OidcAuthorizationError>[0],
  cause: unknown,
) {
  return cause instanceof OidcAuthorizationError
    ? cause
    : new OidcAuthorizationError(code, { cause });
}

export class ExpoOidcClient implements OidcAuthorizationPort, TokenRefreshPort {
  private readonly redirectUri = AuthSession.makeRedirectUri({
    path: OIDC_REDIRECT_PATH,
    scheme: OIDC_REDIRECT_SCHEME,
  });

  constructor(private readonly config: OidcPublicConfig) {}

  async authorize(): Promise<OidcAuthorizationResult> {
    let discovery: AuthSession.DiscoveryDocument;
    try {
      discovery = await AuthSession.fetchDiscoveryAsync(this.config.issuer);
    } catch (cause) {
      throw authorizationError('discovery_failed', cause);
    }

    const request = new AuthSession.AuthRequest({
      clientId: this.config.clientId,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      redirectUri: this.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: [...this.config.scopes],
      usePKCE: true,
    });

    let response: AuthSession.AuthSessionResult;
    try {
      response = await request.promptAsync(discovery);
    } catch (cause) {
      throw authorizationError('authorization_failed', cause);
    }

    if (response.type === 'cancel' || response.type === 'dismiss') {
      return { status: 'cancelled' };
    }
    if (response.type !== 'success') {
      throw new OidcAuthorizationError('authorization_failed');
    }

    const code = response.params.code;
    const codeVerifier = request.codeVerifier;
    if (code === undefined || codeVerifier === undefined) {
      throw new OidcAuthorizationError('authorization_response_invalid');
    }

    try {
      const tokens = await AuthSession.exchangeCodeAsync(
        {
          clientId: this.config.clientId,
          code,
          extraParams: { code_verifier: codeVerifier },
          redirectUri: this.redirectUri,
          scopes: [...this.config.scopes],
        },
        discovery,
      );
      const refreshToken = tokens.refreshToken;
      if (refreshToken === undefined) {
        throw new OidcAuthorizationError('refresh_token_required');
      }

      return {
        status: 'authorized',
        tokens: {
          accessToken: requireToken(tokens.accessToken, 'access'),
          refreshToken: requireToken(refreshToken, 'refresh'),
        },
      };
    } catch (cause) {
      throw authorizationError('token_exchange_failed', cause);
    }
  }

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    let discovery: AuthSession.DiscoveryDocument;
    try {
      discovery = await AuthSession.fetchDiscoveryAsync(this.config.issuer);
      const tokens = await AuthSession.refreshAsync(
        {
          clientId: this.config.clientId,
          refreshToken: requireToken(refreshToken, 'refresh'),
          scopes: [...this.config.scopes],
        },
        discovery,
      );

      return {
        accessToken: requireToken(tokens.accessToken, 'access'),
        ...(tokens.refreshToken === undefined
          ? {}
          : { refreshToken: requireToken(tokens.refreshToken, 'refresh') }),
      };
    } catch (cause) {
      throw authorizationError('refresh_failed', cause);
    }
  }
}
