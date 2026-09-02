import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { radius } from '../tokens';

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
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: { opacity: 0.72 },
});
