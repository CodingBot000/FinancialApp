import { describe, expect, it } from 'vitest';

import { calculateRiskQuestionnaire } from './risk-questionnaire';

describe('risk questionnaire', () => {
  it.each([
    [
      'CONSERVATIVE',
      {
        LOSS_RESPONSE: 'SELL_SOME',
        INVESTMENT_HORIZON: 'WITHIN_THREE_YEARS',
        INVESTMENT_PRIORITY: 'STABILITY',
      },
      36,
    ],
    [
      'BALANCED',
      {
        LOSS_RESPONSE: 'HOLD',
        INVESTMENT_HORIZON: 'THREE_TO_SEVEN_YEARS',
        INVESTMENT_PRIORITY: 'BALANCE',
      },
      60,
    ],
    [
      'GROWTH',
      {
        LOSS_RESPONSE: 'INVEST_MORE',
        INVESTMENT_HORIZON: 'AFTER_SEVEN_YEARS',
        INVESTMENT_PRIORITY: 'GROWTH',
      },
      120,
    ],
  ] as const)(
    'maps a complete answer set to %s',
    (riskLevel, answers, investmentHorizonMonths) => {
      expect(calculateRiskQuestionnaire(answers)).toMatchObject({
        investmentHorizonMonths,
        riskLevel,
      });
    },
  );

  it('does not calculate a result from incomplete answers', () => {
    expect(
      calculateRiskQuestionnaire({ LOSS_RESPONSE: 'HOLD' }),
    ).toBeUndefined();
  });
});
