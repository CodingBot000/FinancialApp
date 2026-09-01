import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import type { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import { GetCurrentUserUseCase as GetCurrentUserUseCaseToken } from '../application/get-current-user.use-case.js';
import type { CurrentUser } from '../domain/current-user.js';

@Controller('/api/v1/me')
@UseGuards(OidcJwtGuard)
@RequiredScopes('financial.read')
export class MeController {
  constructor(
    @Inject(GetCurrentUserUseCaseToken)
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Get()
  getMe(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<CurrentUser> {
    return this.getCurrentUser.execute(principal);
  }
}
