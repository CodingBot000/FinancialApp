import type {
  RiskProfile,
  RiskProfileUpdate,
} from '../../domain/risk-profile.js';

export const RISK_PROFILE_REPOSITORY = Symbol('RISK_PROFILE_REPOSITORY');

export interface RiskProfileRepository {
  getRiskProfile(userId: string): Promise<RiskProfile>;
  updateRiskProfile(
    userId: string,
    input: RiskProfileUpdate,
  ): Promise<RiskProfile | undefined>;
}
