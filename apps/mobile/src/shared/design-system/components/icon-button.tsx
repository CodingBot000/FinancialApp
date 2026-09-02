import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../tokens';

export function IconButton({
  accessibilityLabel,
  children,
  onPress,
}: {
  readonly accessibilityLabel: string;
  readonly children: ReactNode;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.full,
    height: spacing[12],
    justifyContent: 'center',
    width: spacing[12],
  },
  pressed: { opacity: 0.72 },
});
