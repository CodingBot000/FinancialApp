import type { AccessTokenStore } from './access-token-store';
import type { RefreshTokenStore } from './refresh-token-store';
import { requireToken, SessionPersistenceError } from './session-errors';

export type EstablishedSession = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

export type SessionPresence = 'unknown' | 'active' | 'absent' | 'unavailable';

type SessionPresenceListener = () => void;

export class AuthSessionManager {
  private readonly presenceListeners = new Set<SessionPresenceListener>();
  private sessionPresence: SessionPresence = 'unknown';

  constructor(
    private readonly accessTokenStore: AccessTokenStore,
    private readonly refreshTokenStore: RefreshTokenStore,
  ) {}

  async clear() {
    this.accessTokenStore.clear();
    await this.refreshTokenStore.clear();
    this.setSessionPresence('absent');
  }

  async establish(session: EstablishedSession) {
    const accessToken = requireToken(session.accessToken, 'access');
    const refreshToken = requireToken(session.refreshToken, 'refresh');

    try {
      await this.refreshTokenStore.write(refreshToken);
      this.accessTokenStore.write(accessToken);
      this.setSessionPresence('active');
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

  getSessionPresence = () => this.sessionPresence;

  async hasRefreshSession() {
    const refreshToken = await this.refreshTokenStore.read();
    if (refreshToken === undefined) {
      this.setSessionPresence('absent');
      return false;
    }

    try {
      requireToken(refreshToken, 'refresh');
      this.setSessionPresence('active');
      return true;
    } catch {
      await this.clear();
      return false;
    }
  }

  async inspectSessionPresence() {
    try {
      await this.hasRefreshSession();
    } catch {
      this.setSessionPresence('unavailable');
    }

    return this.sessionPresence;
  }

  subscribeToSessionPresence = (listener: SessionPresenceListener) => {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  };

  private setSessionPresence(nextPresence: SessionPresence) {
    if (nextPresence === this.sessionPresence) {
      return;
    }

    this.sessionPresence = nextPresence;
    for (const listener of this.presenceListeners) {
      listener();
    }
  }
}
