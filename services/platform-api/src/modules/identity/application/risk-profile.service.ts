import { Inject, Injectable, Optional } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { AuditService } from '../../audit/audit.service.js';
import type { RiskProfile, RiskProfileUpdate } from '../domain/risk-profile.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from './ports/identity-repository.port.js';
import {
  RISK_PROFILE_REPOSITORY,
  type RiskProfileRepository,
} from './ports/risk-profile-repository.port.js';

export class RiskProfileInputError extends Error {}
export class RiskProfileVersionConflictError extends Error {}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class RiskProfileService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
    @Inject(RISK_PROFILE_REPOSITORY)
    private readonly riskProfileRepository: RiskProfileRepository,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  async get(principal: AuthenticatedPrincipal): Promise<RiskProfile> {
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    return this.riskProfileRepository.getRiskProfile(user.userId);
  }

  async update(
    principal: AuthenticatedPrincipal,
    body: unknown,
    traceId = 'unavailable',
  ): Promise<RiskProfile> {
    const input = this.validate(body);
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const updated = await this.riskProfileRepository.updateRiskProfile(
      user.userId,
      input,
    );
    if (updated === undefined) throw new RiskProfileVersionConflictError();
    await this.audit?.record({
      userId: user.userId,
      action: 'RISK_PROFILE_UPDATED',
      resourceType: 'RISK_PROFILE',
      resourceId: user.userId,
      traceId,
      metadata: { status: 'UPDATED', syntheticData: true },
    });
    return updated;
  }

  private validate(body: unknown): RiskProfileUpdate {
    if (
      !isRecord(body) ||
      !['CONSERVATIVE', 'BALANCED', 'GROWTH'].includes(
        String(body.riskLevel),
      ) ||
      !Number.isInteger(body.investmentHorizonMonths) ||
      Number(body.investmentHorizonMonths) < 1 ||
      Number(body.investmentHorizonMonths) > 600 ||
      typeof body.monthlyContribution !== 'string' ||
      !/^\d+(?:\.\d{1,4})?$/.test(body.monthlyContribution) ||
      Number(body.monthlyContribution) > 10_000_000_000 ||
      typeof body.expectedVersion !== 'string' ||
      !/^\d+$/.test(body.expectedVersion)
    ) {
      throw new RiskProfileInputError();
    }
    return {
      riskLevel: body.riskLevel as RiskProfileUpdate['riskLevel'],
      investmentHorizonMonths: Number(body.investmentHorizonMonths),
      monthlyContribution: body.monthlyContribution,
      expectedVersion: body.expectedVersion,
    };
  }
}
