import type { AccessTokenStore } from './access-token-store';
import type { RefreshTokenStore } from './refresh-token-store';
import { requireToken, SessionExpiredError } from './session-errors';

export type RefreshedTokens = Readonly<{
  accessToken: string;
  refreshToken?: string;
}>;

export interface TokenRefreshPort {
  refresh(refreshToken: string): Promise<RefreshedTokens>;
}

export class RefreshCoordinator {
  private activeRefresh: Promise<string> | undefined;

  constructor(
    private readonly accessTokenStore: AccessTokenStore,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly tokenRefresh: TokenRefreshPort,
    private readonly onSessionExpired: () => void | Promise<void> = () =>
      undefined,
  ) {}

  refreshAccessToken() {
    if (this.activeRefresh !== undefined) {
      return this.activeRefresh;
    }

    this.activeRefresh = this.performRefresh().finally(() => {
      this.activeRefresh = undefined;
    });

    return this.activeRefresh;
  }

  private async clearLocalSession() {
    this.accessTokenStore.clear();
    await this.refreshTokenStore.clear().catch(() => undefined);
  }

  private async performRefresh() {
    try {
      const refreshToken = await this.refreshTokenStore.read();
      if (refreshToken === undefined) {
        throw new SessionExpiredError();
      }

      const refreshed = await this.tokenRefresh.refresh(
        requireToken(refreshToken, 'refresh'),
      );
      const accessToken = requireToken(refreshed.accessToken, 'access');

      if (refreshed.refreshToken !== undefined) {
        await this.refreshTokenStore.write(
          requireToken(refreshed.refreshToken, 'refresh'),
        );
      }

      this.accessTokenStore.write(accessToken);
      return accessToken;
    } catch (cause) {
      await this.clearLocalSession();
      await this.onSessionExpired();
      if (cause instanceof SessionExpiredError) {
        throw cause;
      }
      throw new SessionExpiredError({ cause });
    }
  }
}
