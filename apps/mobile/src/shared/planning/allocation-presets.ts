import type { RiskProfile, SimulationAssetClass } from '../api';

export const PLANNING_ASSET_CLASSES = [
  'CASH',
  'BOND',
  'EQUITY',
] as const satisfies readonly SimulationAssetClass[];

export type PlanningAssetClass = (typeof PLANNING_ASSET_CLASSES)[number];

export const DEFAULT_PLANNING_RISK_PROFILE =
  'BALANCED' as const satisfies RiskProfile;

export interface PlanningAllocationItem {
  readonly assetClass: PlanningAssetClass;
  readonly weight: number;
}

export type PlanningAllocation = readonly PlanningAllocationItem[];

export type AllocationPercentages = Readonly<
  Record<PlanningAssetClass, number>
>;

const ALLOCATION_PRESETS: Readonly<Record<RiskProfile, PlanningAllocation>> = {
  CONSERVATIVE: [
    { assetClass: 'CASH', weight: 0.2 },
    { assetClass: 'BOND', weight: 0.5 },
    { assetClass: 'EQUITY', weight: 0.3 },
  ],
  BALANCED: [
    { assetClass: 'CASH', weight: 0.1 },
    { assetClass: 'BOND', weight: 0.3 },
    { assetClass: 'EQUITY', weight: 0.6 },
  ],
  GROWTH: [
    { assetClass: 'CASH', weight: 0.05 },
    { assetClass: 'BOND', weight: 0.15 },
    { assetClass: 'EQUITY', weight: 0.8 },
  ],
};

export const RISK_PROFILE_LABELS = {
  CONSERVATIVE: '안정형',
  BALANCED: '균형형',
  GROWTH: '성장형',
} as const satisfies Readonly<Record<RiskProfile, string>>;

export type RiskProfileLabel = (typeof RISK_PROFILE_LABELS)[RiskProfile];

export const PLANNING_ASSET_CLASS_LABELS: Readonly<
  Record<PlanningAssetClass, string>
> = {
  CASH: '현금',
  BOND: '채권',
  EQUITY: '주식',
};

export function allocationForRiskProfile(
  riskProfile: RiskProfile,
): PlanningAllocation {
  return ALLOCATION_PRESETS[riskProfile];
}

export function isAllocationNormalized(
  allocation: PlanningAllocation,
): boolean {
  const total = allocation.reduce((sum, item) => sum + item.weight, 0);
  return Math.abs(total - 1) < Number.EPSILON * 10;
}

export function allocationToPercentages(
  allocation: PlanningAllocation,
): AllocationPercentages {
  const percentages: Record<PlanningAssetClass, number> = {
    CASH: 0,
    BOND: 0,
    EQUITY: 0,
  };
  for (const item of allocation) {
    percentages[item.assetClass] = Math.round(item.weight * 100);
  }
  return percentages;
}

export function formatAllocationSummary(
  allocation: PlanningAllocation,
): string {
  const percentages = allocationToPercentages(allocation);
  return PLANNING_ASSET_CLASSES.map(
    (assetClass) =>
      `${PLANNING_ASSET_CLASS_LABELS[assetClass]} ${percentages[assetClass]}%`,
  ).join(' · ');
}
