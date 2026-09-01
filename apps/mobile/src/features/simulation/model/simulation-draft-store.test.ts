import { beforeEach, describe, expect, it } from 'vitest';

import {
  toSimulationInput,
  useSimulationDraftStore,
  validateSimulationDraft,
} from './simulation-draft-store';

describe('simulation draft', () => {
  beforeEach(() => useSimulationDraftStore.getState().reset());

  it('keeps only pre-submit input in Zustand and maps canonical API input', () => {
    const draft = useSimulationDraftStore.getState();
    expect(toSimulationInput(draft)).toMatchObject({
      durationMonths: 120,
      allocation: [
        { assetClass: 'CASH', weight: 0.1 },
        { assetClass: 'BOND', weight: 0.3 },
        { assetClass: 'EQUITY', weight: 0.6 },
      ],
    });
    expect(draft).not.toHaveProperty('result');
    expect(draft).not.toHaveProperty('simulationId');
  });

  it('rejects invalid money precision and duration before network submit', () => {
    expect(
      validateSimulationDraft({
        durationMonths: '601',
        initialAssets: '-1',
        monthlyContribution: '1.00000',
        targetAmount: 'not-money',
      }),
    ).toEqual({
      durationMonths: '기간은 1~600개월의 정수여야 합니다.',
      initialAssets: '0 이상의 금액을 소수점 4자리 이내로 입력하세요.',
      monthlyContribution: '0 이상의 금액을 소수점 4자리 이내로 입력하세요.',
      targetAmount: '0 이상의 금액을 소수점 4자리 이내로 입력하세요.',
    });
  });
});
