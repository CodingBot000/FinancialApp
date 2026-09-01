import type {
  AuthSessionManager,
  OidcAuthorizationPort,
} from '../../../shared/auth';

export type LoginResult = 'cancelled' | 'established';

export class OidcLoginService {
  constructor(
    private readonly authorization: OidcAuthorizationPort,
    private readonly sessionManager: AuthSessionManager,
  ) {}

  async login(): Promise<LoginResult> {
    const result = await this.authorization.authorize();
    if (result.status === 'cancelled') {
      return 'cancelled';
    }

    await this.sessionManager.establish(result.tokens);
    return 'established';
  }
}
