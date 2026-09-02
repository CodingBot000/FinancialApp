import type {
  OidcAuthorizationPort,
  OidcAuthorizationResult,
} from './oidc-authorization';
import type { RefreshedTokens, TokenRefreshPort } from './refresh-coordinator';

export const DEFAULT_LOCAL_TEST_ACCESS_TOKEN = '<LOCAL_TEST_ACCESS_TOKEN>';

/** Local-only token provider; it never participates in demo or production. */
export class LocalTestOidcClient
  implements OidcAuthorizationPort, TokenRefreshPort
{
  private readonly token: string;

  constructor(
    token = process.env.EXPO_PUBLIC_LOCAL_TEST_ACCESS_TOKEN?.trim() ||
      DEFAULT_LOCAL_TEST_ACCESS_TOKEN,
  ) {
    this.token = token;
  }

  async authorize(): Promise<OidcAuthorizationResult> {
    return {
      status: 'authorized',
      tokens: {
        accessToken: this.token,
        refreshToken: this.token,
      },
    };
  }

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    if (refreshToken !== this.token) {
      throw new Error('The local test refresh token is invalid.');
    }
    return { accessToken: this.token, refreshToken: this.token };
  }
}
