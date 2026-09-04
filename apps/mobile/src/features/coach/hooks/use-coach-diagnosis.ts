import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { usePlatformApi } from '../../../shared/api';
import { formatCompactWon } from '../../../shared/format/finance-format';
import {
  PLANNING_ASSET_CLASSES,
  PLANNING_ASSET_CLASS_LABELS,
} from '../../../shared/planning';
import { createCoachDiagnosis } from '../model/coach-diagnosis';

export interface CoachAllocationRow {
  readonly assetClass: string;
  readonly label: string;
  readonly value: string;
}

export interface CoachViewModel {
  readonly allocationAccessibilityLabel: string;
  readonly allocationRows: readonly CoachAllocationRow[];
  readonly contributionDescription: string;
  readonly diagnosisDescription: string;
  readonly diagnosisHeadline: string;
  readonly diagnosisHeadlineAccessibilityLabel: string;
  readonly profileSummary: string;
}

export function formatInvestmentHorizon(months: number): string {
  return months % 12 === 0 ? `${months / 12}년` : `${months}개월`;
}

export function useCoachDiagnosis() {
  const api = usePlatformApi();
  const [assetSummary, riskProfile] = useQueries({
    queries: [
      {
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          api.getAssetSummary({ signal }),
        queryKey: ['wealth', 'summary'] as const,
      },
      {
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          api.getRiskProfile({ signal }),
        queryKey: ['risk-profile'] as const,
      },
    ],
  });

  const viewModel = useMemo<CoachViewModel | undefined>(() => {
    if (assetSummary.data === undefined || riskProfile.data === undefined) {
      return undefined;
    }

    const diagnosis = createCoachDiagnosis(
      assetSummary.data,
      riskProfile.data.riskLevel,
    );
    const allocationRows = PLANNING_ASSET_CLASSES.map((assetClass) => ({
      assetClass,
      label: PLANNING_ASSET_CLASS_LABELS[assetClass],
      value: `${Math.round(diagnosis.currentAllocation[assetClass])}% → ${Math.round(diagnosis.suggestedAllocation[assetClass])}%`,
    }));
    const currentAccessibility = PLANNING_ASSET_CLASSES.map(
      (assetClass) =>
        `${PLANNING_ASSET_CLASS_LABELS[assetClass]} ${Math.round(diagnosis.currentAllocation[assetClass])}%`,
    ).join(', ');
    const suggestedAccessibility = PLANNING_ASSET_CLASSES.map(
      (assetClass) =>
        `${PLANNING_ASSET_CLASS_LABELS[assetClass]} ${Math.round(diagnosis.suggestedAllocation[assetClass])}%`,
    ).join(', ');

    return {
      allocationAccessibilityLabel: `현재 ${currentAccessibility}. 제안 ${suggestedAccessibility}.`,
      allocationRows,
      contributionDescription: `월 ${formatCompactWon(riskProfile.data.monthlyContribution)}씩 투자하는 계획을 기준으로 살펴봤어요.`,
      diagnosisDescription: diagnosis.description,
      diagnosisHeadline: diagnosis.headline,
      diagnosisHeadlineAccessibilityLabel: diagnosis.headline.replace(
        '%p',
        '퍼센트포인트',
      ),
      profileSummary: `${diagnosis.profileLabel} · ${formatInvestmentHorizon(riskProfile.data.investmentHorizonMonths)}`,
    };
  }, [assetSummary.data, riskProfile.data]);

  const retry = useCallback(() => {
    void Promise.all([assetSummary.refetch(), riskProfile.refetch()]);
  }, [assetSummary, riskProfile]);

  const hasData = viewModel !== undefined;
  const hasQueryError = assetSummary.isError || riskProfile.isError;

  return {
    error: hasData ? undefined : (assetSummary.error ?? riskProfile.error),
    partialError: hasData && hasQueryError,
    pending: !hasData && (assetSummary.isPending || riskProfile.isPending),
    refreshing:
      hasData &&
      (assetSummary.isFetching || riskProfile.isFetching) &&
      !hasQueryError,
    retry,
    viewModel,
  };
}
