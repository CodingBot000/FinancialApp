import type { AccessTokenStore } from './access-token-store';
import type { RefreshTokenStore } from './refresh-token-store';
import { requireToken, SessionPersistenceError } from './session-errors';

export type EstablishedSession = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

export class AuthSessionManager {
  constructor(
    private readonly accessTokenStore: AccessTokenStore,
    private readonly refreshTokenStore: RefreshTokenStore,
  ) {}

  async clear() {
    this.accessTokenStore.clear();
    await this.refreshTokenStore.clear();
  }

  async establish(session: EstablishedSession) {
    const accessToken = requireToken(session.accessToken, 'access');
    const refreshToken = requireToken(session.refreshToken, 'refresh');

    try {
      await this.refreshTokenStore.write(refreshToken);
      this.accessTokenStore.write(accessToken);
    } catch (cause) {
      this.accessTokenStore.clear();
      await this.refreshTokenStore.clear().catch(() => undefined);
      if (cause instanceof SessionPersistenceError) {
        throw cause;
      }
      throw new SessionPersistenceError({ cause });
    }
  }

  getAccessToken() {
    return this.accessTokenStore.read();
  }

  async hasRefreshSession() {
    const refreshToken = await this.refreshTokenStore.read();
    if (refreshToken === undefined) {
      return false;
    }

    try {
      requireToken(refreshToken, 'refresh');
      return true;
    } catch {
      await this.clear();
      return false;
    }
  }
}
