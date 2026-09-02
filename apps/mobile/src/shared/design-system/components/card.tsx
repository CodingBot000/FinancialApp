import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '../tokens';

export type CardVariant =
  'default' | 'subtle' | 'warm' | 'info' | 'warning' | 'danger';

const backgrounds: Record<CardVariant, string> = {
  default: colors.surface.primary,
  subtle: colors.surface.subtle,
  warm: colors.surface.warm,
  info: colors.surface.info,
  warning: colors.surface.warning,
  danger: colors.surface.danger,
};

const borders: Record<CardVariant, string> = {
  default: colors.border.strong,
  subtle: 'transparent',
  warm: 'transparent',
  info: 'transparent',
  warning: 'transparent',
  danger: 'transparent',
};

export function Card({
  children,
  style,
  variant = 'default',
  ...props
}: ViewProps & {
  readonly children: ReactNode;
  readonly variant?: CardVariant;
}) {
  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: backgrounds[variant],
          borderColor: borders[variant],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[5],
  },
});
