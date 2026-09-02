import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from '../tokens';

export function NoticeBanner({
  children,
  title,
  variant = 'info',
}: {
  readonly children?: ReactNode;
  readonly title: string;
  readonly variant?: 'info' | 'success' | 'warning' | 'danger';
}) {
  const tone =
    variant === 'danger'
      ? 'danger'
      : variant === 'warning'
        ? 'warning'
        : variant === 'success'
          ? 'success'
          : 'secondary';
  const background =
    variant === 'danger'
      ? colors.surface.danger
      : variant === 'warning'
        ? colors.surface.warning
        : variant === 'success'
          ? colors.surface.success
          : colors.surface.info;
  return (
    <View
      accessibilityRole={variant === 'danger' ? 'alert' : undefined}
      style={[styles.base, { backgroundColor: background }]}
    >
      <AppText tone={tone} variant="bodyStrong">
        {title}
      </AppText>
      {children ? (
        typeof children === 'string' ? (
          <AppText tone="secondary" variant="caption">
            {children}
          </AppText>
        ) : (
          <View style={styles.content}>{children}</View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.input, gap: spacing[1], padding: spacing[4] },
  content: { gap: spacing[2] },
});
