import { create } from 'zustand';

interface MoneyVisibilityState {
  readonly hidden: boolean;
  readonly toggle: () => void;
}

export const useMoneyVisibilityStore = create<MoneyVisibilityState>((set) => ({
  hidden: false,
  toggle: () => set((state) => ({ hidden: !state.hidden })),
}));
