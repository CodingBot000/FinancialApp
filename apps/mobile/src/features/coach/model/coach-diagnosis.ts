import type { AssetSummary, RiskProfile } from '../../../shared/api';
import {
  PLANNING_ASSET_CLASSES,
  PLANNING_ASSET_CLASS_LABELS,
  RISK_PROFILE_LABELS,
  allocationForRiskProfile,
  allocationToPercentages,
  type AllocationPercentages,
  type PlanningAssetClass,
  type RiskProfileLabel,
} from '../../../shared/planning';

export type CoachDiagnosisStatus = 'ALIGNED' | 'NEEDS_ATTENTION';
export type AllocationDirection = 'ALIGNED' | 'OVER' | 'UNDER';

export interface CoachDiagnosis {
  readonly status: CoachDiagnosisStatus;
  readonly direction: AllocationDirection;
  readonly profileLabel: RiskProfileLabel;
  readonly currentAllocation: AllocationPercentages;
  readonly suggestedAllocation: AllocationPercentages;
  readonly focusAssetClass: PlanningAssetClass;
  readonly differencePercentagePoints: number;
  readonly headline: string;
  readonly description: string;
}

const FOCUS_PRIORITY = [
  'EQUITY',
  'BOND',
  'CASH',
] as const satisfies readonly PlanningAssetClass[];
const ALIGNED_THRESHOLD_PERCENTAGE_POINTS = 5;

export function normalizeAssetAllocation(
  allocation: AssetSummary['allocation'],
): AllocationPercentages {
  const weights: Record<PlanningAssetClass, number> = {
    CASH: 0,
    BOND: 0,
    EQUITY: 0,
  };

  for (const item of allocation) {
    if (
      PLANNING_ASSET_CLASSES.includes(item.assetClass as PlanningAssetClass) &&
      Number.isFinite(item.weight) &&
      item.weight > 0
    ) {
      weights[item.assetClass as PlanningAssetClass] += item.weight;
    }
  }

  const total = PLANNING_ASSET_CLASSES.reduce(
    (sum, assetClass) => sum + weights[assetClass],
    0,
  );
  if (total === 0) return weights;

  return {
    CASH: (weights.CASH / total) * 100,
    BOND: (weights.BOND / total) * 100,
    EQUITY: (weights.EQUITY / total) * 100,
  };
}

function focusAssetClassFor(
  current: AllocationPercentages,
  suggested: AllocationPercentages,
): PlanningAssetClass {
  let focusAssetClass: PlanningAssetClass = FOCUS_PRIORITY[0];
  let largestDifference = -1;
  for (const assetClass of FOCUS_PRIORITY) {
    const difference = Math.abs(current[assetClass] - suggested[assetClass]);
    if (difference > largestDifference) {
      focusAssetClass = assetClass;
      largestDifference = difference;
    }
  }
  return focusAssetClass;
}

export function createCoachDiagnosis(
  summary: AssetSummary,
  riskProfile: RiskProfile,
): CoachDiagnosis {
  const currentAllocation = normalizeAssetAllocation(summary.allocation);
  const suggestedAllocation = allocationToPercentages(
    allocationForRiskProfile(riskProfile),
  );
  const focusAssetClass = focusAssetClassFor(
    currentAllocation,
    suggestedAllocation,
  );
  const signedDifference =
    currentAllocation[focusAssetClass] - suggestedAllocation[focusAssetClass];
  const absoluteDifference = Math.abs(signedDifference);
  const differencePercentagePoints = Math.round(absoluteDifference);
  const currentPercentage = Math.round(currentAllocation[focusAssetClass]);
  const suggestedPercentage = Math.round(suggestedAllocation[focusAssetClass]);
  const profileLabel = RISK_PROFILE_LABELS[riskProfile];
  const assetClassLabel = PLANNING_ASSET_CLASS_LABELS[focusAssetClass];

  if (absoluteDifference <= ALIGNED_THRESHOLD_PERCENTAGE_POINTS) {
    return {
      status: 'ALIGNED',
      direction: 'ALIGNED',
      profileLabel,
      currentAllocation,
      suggestedAllocation,
      focusAssetClass,
      differencePercentagePoints,
      headline: `현재 자산 배분이 ${profileLabel} 기준과 가까워요.`,
      description: `가장 큰 차이가 ${differencePercentagePoints}%p 이내입니다. 목표 금액과 납입 계획을 중심으로 다음 단계를 확인해 보세요.`,
    };
  }

  const direction: AllocationDirection =
    signedDifference > 0 ? 'OVER' : 'UNDER';
  const directionLabel = direction === 'OVER' ? '높아요' : '낮아요';
  const adjustment =
    direction === 'OVER'
      ? '조정해 다른 자산군과의 균형을 살펴봅니다.'
      : '조정한 모습을 비교할 수 있어요.';

  return {
    status: 'NEEDS_ATTENTION',
    direction,
    profileLabel,
    currentAllocation,
    suggestedAllocation,
    focusAssetClass,
    differencePercentagePoints,
    headline: `${profileLabel} 기준보다 ${assetClassLabel} 비중이 ${differencePercentagePoints}%p ${directionLabel}.`,
    description: `현재 ${assetClassLabel} 비중은 ${currentPercentage}%입니다. 제안안에서는 ${suggestedPercentage}%로 ${adjustment}`,
  };
}
