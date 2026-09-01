import type { RiskLevel } from './current-user.js';

export interface RiskProfile {
  readonly riskLevel: RiskLevel;
  readonly investmentHorizonMonths: number;
  readonly monthlyContribution: string;
  readonly version: string;
  readonly updatedAt: string;
}

export interface RiskProfileUpdate {
  readonly riskLevel: RiskLevel;
  readonly investmentHorizonMonths: number;
  readonly monthlyContribution: string;
  readonly expectedVersion: string;
}
