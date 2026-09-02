import { type ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing, typography } from '../tokens';

export function TextField({
  errorText,
  helperText,
  label,
  ...props
}: ComponentProps<typeof TextInput> & {
  readonly errorText?: string;
  readonly helperText?: string;
  readonly label: string;
}) {
  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={
          props.placeholderTextColor ?? colors.text.tertiary
        }
        style={[
          styles.input,
          errorText ? styles.errorInput : null,
          props.style,
        ]}
      />
      {errorText ? (
        <AppText accessibilityRole="alert" tone="danger" variant="caption">
          {errorText}
        </AppText>
      ) : helperText ? (
        <AppText tone="secondary" variant="caption">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[2] },
  errorInput: { borderColor: colors.text.danger },
  input: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: radius.input,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
});
