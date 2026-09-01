import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';

import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';

@Injectable()
export class DeveloperAccessGuard implements CanActivate {
  constructor(@Inject(OidcJwtGuard) private readonly oidc: OidcJwtGuard) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if ((process.env.APP_ENV ?? 'local') === 'local') return true;
    return this.oidc.canActivate(context);
  }
}
