import { colors } from './colors';

export const shadows = {
  none: {},
  floating: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;
