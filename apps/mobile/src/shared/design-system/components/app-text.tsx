import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '../tokens';

export type AppTextVariant = keyof typeof typography;
export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'marketUp'
  | 'marketDown';

const toneColors: Record<AppTextTone, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  inverse: colors.text.inverse,
  brand: colors.text.brand,
  success: colors.text.success,
  warning: colors.text.warning,
  danger: colors.text.danger,
  marketUp: colors.market.up,
  marketDown: colors.market.down,
};

export function AppText({
  children,
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: TextProps & {
  readonly tone?: AppTextTone;
  readonly variant?: AppTextVariant;
}) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        typography[variant] as TextStyle,
        { color: toneColors[tone] },
        style as TextStyle,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ base: { includeFontPadding: false } });
