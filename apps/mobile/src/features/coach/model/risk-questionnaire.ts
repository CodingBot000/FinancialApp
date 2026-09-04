import type { RiskProfile } from '../../../shared/api';
import { RISK_PROFILE_LABELS } from '../../../shared/planning';

export type RiskQuestionId =
  'LOSS_RESPONSE' | 'INVESTMENT_HORIZON' | 'INVESTMENT_PRIORITY';

export type RiskAnswerValue =
  | 'SELL_SOME'
  | 'HOLD'
  | 'INVEST_MORE'
  | 'WITHIN_THREE_YEARS'
  | 'THREE_TO_SEVEN_YEARS'
  | 'AFTER_SEVEN_YEARS'
  | 'STABILITY'
  | 'BALANCE'
  | 'GROWTH';

export interface RiskQuestionOption {
  readonly label: string;
  readonly score: number;
  readonly value: RiskAnswerValue;
  readonly investmentHorizonMonths?: number;
}

export interface RiskQuestion {
  readonly id: RiskQuestionId;
  readonly options: readonly RiskQuestionOption[];
  readonly title: string;
}

export type RiskAnswers = Partial<
  Readonly<Record<RiskQuestionId, RiskAnswerValue>>
>;

export interface RiskQuestionnaireResult {
  readonly description: string;
  readonly investmentHorizonMonths: number;
  readonly label: string;
  readonly riskLevel: RiskProfile;
  readonly score: number;
}

export const RISK_QUESTIONS: readonly RiskQuestion[] = [
  {
    id: 'LOSS_RESPONSE',
    title: '투자 자산이 단기간에 15% 하락한다면 어떻게 하시겠어요?',
    options: [
      { label: '일부 매도', score: 0, value: 'SELL_SOME' },
      { label: '그대로 유지한다', score: 1, value: 'HOLD' },
      { label: '추가 투자', score: 2, value: 'INVEST_MORE' },
    ],
  },
  {
    id: 'INVESTMENT_HORIZON',
    title: '이 자금을 사용할 시점은 언제인가요?',
    options: [
      {
        investmentHorizonMonths: 36,
        label: '3년 이내',
        score: 0,
        value: 'WITHIN_THREE_YEARS',
      },
      {
        investmentHorizonMonths: 60,
        label: '3~7년',
        score: 1,
        value: 'THREE_TO_SEVEN_YEARS',
      },
      {
        investmentHorizonMonths: 120,
        label: '7년 이후',
        score: 2,
        value: 'AFTER_SEVEN_YEARS',
      },
    ],
  },
  {
    id: 'INVESTMENT_PRIORITY',
    title: '투자에서 더 중요하게 생각하는 결과는 무엇인가요?',
    options: [
      { label: '안정 우선', score: 0, value: 'STABILITY' },
      { label: '균형', score: 1, value: 'BALANCE' },
      { label: '성장 우선', score: 2, value: 'GROWTH' },
    ],
  },
];

const RISK_SCORE_BANDS: readonly Readonly<{
  maximumScore: number;
  riskLevel: RiskProfile;
}>[] = [
  { maximumScore: 2, riskLevel: 'CONSERVATIVE' },
  { maximumScore: 4, riskLevel: 'BALANCED' },
  { maximumScore: 6, riskLevel: 'GROWTH' },
];

const RISK_RESULT_DESCRIPTIONS: Readonly<Record<RiskProfile, string>> = {
  CONSERVATIVE:
    '자산의 안정적인 유지와 변동성 관리에 더 무게를 두는 성향이에요.',
  BALANCED: '안정성과 성장 가능성을 함께 고려하는 성향이에요.',
  GROWTH:
    '가격 변동을 감수하고 장기적인 성장 가능성에 더 무게를 두는 성향이에요.',
};

export function calculateRiskQuestionnaire(
  answers: RiskAnswers,
): RiskQuestionnaireResult | undefined {
  const selectedOptions = RISK_QUESTIONS.map((question) =>
    question.options.find((option) => option.value === answers[question.id]),
  );
  if (selectedOptions.some((option) => option === undefined)) return undefined;

  const options = selectedOptions as readonly RiskQuestionOption[];
  const score = options.reduce((total, option) => total + option.score, 0);
  const riskLevel = RISK_SCORE_BANDS.find(
    (band) => score <= band.maximumScore,
  )?.riskLevel;
  const investmentHorizonMonths = options.find(
    (option) => option.investmentHorizonMonths !== undefined,
  )?.investmentHorizonMonths;

  if (riskLevel === undefined || investmentHorizonMonths === undefined) {
    return undefined;
  }

  return {
    description: RISK_RESULT_DESCRIPTIONS[riskLevel],
    investmentHorizonMonths,
    label: RISK_PROFILE_LABELS[riskLevel],
    riskLevel,
    score,
  };
}
