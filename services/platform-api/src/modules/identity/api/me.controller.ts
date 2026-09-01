import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Inject,
  Put,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import type { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import { GetCurrentUserUseCase as GetCurrentUserUseCaseToken } from '../application/get-current-user.use-case.js';
import type { CurrentUser } from '../domain/current-user.js';
import type { RiskProfile } from '../domain/risk-profile.js';
import {
  RiskProfileInputError,
  RiskProfileService,
  RiskProfileVersionConflictError,
} from '../application/risk-profile.service.js';

function problem(status: number, code: string, detail: string) {
  return {
    type: `https://wealth-sandbox.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .toLowerCase()
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' '),
    status,
    code,
    detail,
    traceId: 'unavailable',
    retryable: false,
    fieldErrors: [],
  };
}

@Controller('/api/v1/me')
@UseGuards(OidcJwtGuard)
@RequiredScopes('financial.read')
export class MeController {
  constructor(
    @Inject(GetCurrentUserUseCaseToken)
    private readonly getCurrentUser: GetCurrentUserUseCase,
    @Inject(RiskProfileService)
    private readonly riskProfiles: RiskProfileService,
  ) {}

  @Get()
  getMe(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<CurrentUser> {
    return this.getCurrentUser.execute(principal);
  }

  @Get('/risk-profile')
  getRiskProfile(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<RiskProfile> {
    return this.riskProfiles.get(principal);
  }

  @Put('/risk-profile')
  @RequiredScopes('financial.write')
  async updateRiskProfile(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers('x-correlation-id') traceId: string | undefined,
    @Body() body: unknown,
  ): Promise<RiskProfile> {
    try {
      return await this.riskProfiles.update(principal, body, traceId);
    } catch (error: unknown) {
      if (error instanceof RiskProfileInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Risk profile is invalid.'),
        );
      }
      if (error instanceof RiskProfileVersionConflictError) {
        throw new ConflictException(
          problem(
            409,
            'VERSION_CONFLICT',
            'Risk profile was updated by another request.',
          ),
        );
      }
      throw error;
    }
  }
}
