import { colors, palette, typography } from '../tokens';

export const chartTheme = {
  axis: colors.text.tertiary,
  grid: colors.border.subtle,
  line: colors.brand.primary,
  point: colors.brand.primary,
  surface: colors.surface.primary,
  tooltipText: colors.text.primary,
  label: typography.caption,
} as const;

export const allocationChartColors = [
  palette.orange500,
  palette.navy700,
  palette.turquoise600,
  palette.sand500,
  palette.neutral400,
] as const;
