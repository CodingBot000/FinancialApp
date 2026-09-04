import { describe, expect, it } from 'vitest';

import {
  allocationForRiskProfile,
  allocationToPercentages,
  formatAllocationSummary,
  isAllocationNormalized,
} from './allocation-presets';

describe('planning allocation presets', () => {
  it.each(['CONSERVATIVE', 'BALANCED', 'GROWTH'] as const)(
    'keeps the %s allocation normalized',
    (riskProfile) => {
      expect(
        isAllocationNormalized(allocationForRiskProfile(riskProfile)),
      ).toBe(true);
    },
  );

  it('exposes the balanced preset for display and simulation input', () => {
    const allocation = allocationForRiskProfile('BALANCED');
    expect(allocationToPercentages(allocation)).toEqual({
      CASH: 10,
      BOND: 30,
      EQUITY: 60,
    });
    expect(formatAllocationSummary(allocation)).toBe(
      '현금 10% · 채권 30% · 주식 60%',
    );
  });
});
