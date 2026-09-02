import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from '../tokens';

export type ButtonVariant =
  'primary' | 'secondary' | 'brand' | 'destructive' | 'ghost';

const variantStyles: Record<
  ButtonVariant,
  {
    backgroundColor: string;
    borderColor: string;
    text: 'primary' | 'inverse' | 'brand' | 'danger';
  }
> = {
  primary: {
    backgroundColor: colors.action.primaryBackground,
    borderColor: colors.action.primaryBackground,
    text: 'inverse',
  },
  secondary: {
    backgroundColor: colors.action.secondaryBackground,
    borderColor: colors.border.strong,
    text: 'primary',
  },
  brand: {
    backgroundColor: colors.action.brandBackground,
    borderColor: colors.action.brandBackground,
    text: 'primary',
  },
  destructive: {
    backgroundColor: colors.action.destructiveBackground,
    borderColor: colors.action.destructiveBackground,
    text: 'inverse',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    text: 'primary',
  },
};

export function Button({
  accessibilityLabel,
  children,
  disabled = false,
  loading = false,
  onPress,
  size = 'large',
  variant = 'primary',
}: {
  readonly accessibilityLabel?: string;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onPress: () => void;
  readonly size?: 'large' | 'medium' | 'small';
  readonly variant?: ButtonVariant;
}) {
  const visual = variantStyles[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        {
          backgroundColor: isDisabled
            ? colors.action.disabledBackground
            : visual.backgroundColor,
          borderColor: isDisabled
            ? colors.action.disabledBackground
            : visual.borderColor,
        },
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isDisabled ? colors.action.disabledText : colors.text.inverse}
        />
      ) : (
        <AppText
          tone={isDisabled ? 'tertiary' : visual.text}
          variant="bodyStrong"
        >
          {children}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.button,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 100,
    paddingHorizontal: spacing[4],
  },
  large: { minHeight: 52 },
  medium: { minHeight: 44 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  small: { minHeight: 36, paddingHorizontal: spacing[3] },
});
