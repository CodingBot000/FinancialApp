import { Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import type { CurrentUser } from '../domain/current-user.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from './ports/identity-repository.port.js';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
  ) {}

  execute(principal: AuthenticatedPrincipal): Promise<CurrentUser> {
    return this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
  }
}
