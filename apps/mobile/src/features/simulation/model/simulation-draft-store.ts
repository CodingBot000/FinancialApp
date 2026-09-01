import { create } from 'zustand';

import type { CreateSimulationInput } from '../../../shared/api';

export interface SimulationDraft {
  readonly durationMonths: string;
  readonly initialAssets: string;
  readonly monthlyContribution: string;
  readonly targetAmount: string;
}

const initialDraft: SimulationDraft = {
  durationMonths: '120',
  initialAssets: '185400000.0000',
  monthlyContribution: '1500000.0000',
  targetAmount: '450000000.0000',
};

interface SimulationDraftState extends SimulationDraft {
  readonly reset: () => void;
  readonly setField: (field: keyof SimulationDraft, value: string) => void;
}

export const useSimulationDraftStore = create<SimulationDraftState>((set) => ({
  ...initialDraft,
  reset: () => set(initialDraft),
  setField: (field, value) => set({ [field]: value }),
}));

const MONEY_INPUT = /^[0-9]+(?:\.[0-9]{1,4})?$/;

export function validateSimulationDraft(draft: SimulationDraft) {
  const errors: Partial<Record<keyof SimulationDraft, string>> = {};
  for (const field of [
    'initialAssets',
    'monthlyContribution',
    'targetAmount',
  ] as const) {
    if (!MONEY_INPUT.test(draft[field]))
      errors[field] = '0 이상의 금액을 소수점 4자리 이내로 입력하세요.';
  }
  const months = Number(draft.durationMonths);
  if (!Number.isInteger(months) || months < 1 || months > 600)
    errors.durationMonths = '기간은 1~600개월의 정수여야 합니다.';
  return errors;
}

export function toSimulationInput(
  draft: SimulationDraft,
): CreateSimulationInput | undefined {
  if (Object.keys(validateSimulationDraft(draft)).length > 0) return undefined;
  return {
    allocation: [
      { assetClass: 'CASH', weight: 0.1 },
      { assetClass: 'BOND', weight: 0.3 },
      { assetClass: 'EQUITY', weight: 0.6 },
    ],
    durationMonths: Number(draft.durationMonths),
    initialAssets: draft.initialAssets,
    monthlyContribution: draft.monthlyContribution,
    targetAmount: draft.targetAmount,
  };
}
