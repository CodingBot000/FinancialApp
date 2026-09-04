import { describe, expect, it } from 'vitest';

import type { AssetSummary, RiskProfile } from '../../../shared/api';
import { createCoachDiagnosis } from './coach-diagnosis';

function summaryWith(allocation: AssetSummary['allocation']): AssetSummary {
  return {
    allocation,
    asOfDate: '2026-09-01',
    cash: '15400000.0000',
    change: { amount: '0.0000', rate: 0 },
    currency: 'KRW',
    investments: '170000000.0000',
    lastSyncedAt: '2026-09-01T10:00:02.000Z',
    totalAssets: '185400000.0000',
  };
}

const defaultSummary = summaryWith([
  { assetClass: 'CASH', amount: '15400000.0000', weight: 0.083064 },
  { assetClass: 'EQUITY', amount: '170000000.0000', weight: 0.916936 },
]);

describe('createCoachDiagnosis', () => {
  it('derives the default 32 percentage-point equity insight', () => {
    const diagnosis = createCoachDiagnosis(defaultSummary, 'BALANCED');
    expect(diagnosis).toMatchObject({
      direction: 'OVER',
      differencePercentagePoints: 32,
      focusAssetClass: 'EQUITY',
      headline: '균형형 기준보다 주식 비중이 32%p 높아요.',
      status: 'NEEDS_ATTENTION',
    });
    expect(diagnosis.description).toBe(
      '현재 주식 비중은 92%입니다. 제안안에서는 60%로 조정해 다른 자산군과의 균형을 살펴봅니다.',
    );
  });

  it('treats a missing bond allocation as zero', () => {
    expect(
      createCoachDiagnosis(defaultSummary, 'BALANCED').currentAllocation.BOND,
    ).toBe(0);
  });

  it.each<[RiskProfile, Readonly<Record<string, number>>]>([
    ['CONSERVATIVE', { CASH: 20, BOND: 50, EQUITY: 30 }],
    ['BALANCED', { CASH: 10, BOND: 30, EQUITY: 60 }],
    ['GROWTH', { CASH: 5, BOND: 15, EQUITY: 80 }],
  ])('uses the %s planning target', (riskProfile, target) => {
    expect(
      createCoachDiagnosis(defaultSummary, riskProfile).suggestedAllocation,
    ).toEqual(target);
  });

  it('classifies a largest difference of five percentage points as aligned', () => {
    const diagnosis = createCoachDiagnosis(
      summaryWith([
        { assetClass: 'CASH', amount: '15', weight: 0.15 },
        { assetClass: 'BOND', amount: '25', weight: 0.25 },
        { assetClass: 'EQUITY', amount: '60', weight: 0.6 },
      ]),
      'BALANCED',
    );
    expect(diagnosis).toMatchObject({
      direction: 'ALIGNED',
      differencePercentagePoints: 5,
      status: 'ALIGNED',
    });
    expect(diagnosis.headline).toBe('현재 자산 배분이 균형형 기준과 가까워요.');
  });

  it('rounds display values and resolves a tie as equity, then bond, then cash', () => {
    const diagnosis = createCoachDiagnosis(
      summaryWith([
        { assetClass: 'CASH', amount: '16', weight: 0.16 },
        { assetClass: 'BOND', amount: '30', weight: 0.3 },
        { assetClass: 'EQUITY', amount: '54', weight: 0.54 },
      ]),
      'BALANCED',
    );
    expect(diagnosis.focusAssetClass).toBe('EQUITY');
    expect(diagnosis.differencePercentagePoints).toBe(6);
    expect(diagnosis.headline).toContain('6%p 낮아요');
  });
});
