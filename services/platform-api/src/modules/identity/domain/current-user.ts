export type RiskLevel = 'CONSERVATIVE' | 'BALANCED' | 'GROWTH';

export interface CurrentUser {
  readonly userId: string;
  readonly displayName: string;
  readonly riskProfile: RiskLevel;
  readonly datasetVersion: string;
  readonly syntheticData: true;
}
