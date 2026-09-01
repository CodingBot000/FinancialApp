import type { AuthSessionManager } from '../auth/auth-session-manager';
import type { RefreshCoordinator } from '../auth/refresh-coordinator';
import { SessionExpiredError } from '../auth/session-errors';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const REPLAYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requestMethod(init: RequestInit | undefined) {
  return (init?.method ?? 'GET').toUpperCase();
}

function withBearer(init: RequestInit | undefined, accessToken: string) {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return { ...init, headers } satisfies RequestInit;
}

export class AuthenticatedFetch {
  constructor(
    private readonly manager: AuthSessionManager,
    private readonly refreshCoordinator: RefreshCoordinator,
    private readonly fetch: FetchLike = globalThis.fetch,
  ) {}

  async request(input: string, init?: RequestInit) {
    const method = requestMethod(init);
    const accessToken =
      this.manager.getAccessToken() ??
      (await this.refreshCoordinator.refreshAccessToken());
    const response = await this.fetch(input, withBearer(init, accessToken));

    if (response.status !== 401) {
      return response;
    }

    const currentAccessToken = this.manager.getAccessToken();
    const refreshedAccessToken =
      currentAccessToken !== undefined && currentAccessToken !== accessToken
        ? currentAccessToken
        : await this.refreshCoordinator.refreshAccessToken();
    if (!REPLAYABLE_METHODS.has(method)) {
      return response;
    }

    const replayedResponse = await this.fetch(
      input,
      withBearer(init, refreshedAccessToken),
    );
    if (replayedResponse.status === 401) {
      await this.manager.clear().catch(() => undefined);
      throw new SessionExpiredError();
    }

    return replayedResponse;
  }
}
