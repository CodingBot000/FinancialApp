import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../tokens';

/** A safe-area aware surface for full-screen launch and onboarding flows. */
export function FullScreenSurface({
  backgroundColor = colors.background.screen,
  children,
}: {
  readonly backgroundColor?: string;
  readonly children: ReactNode;
}) {
  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor }]}
    >
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  safeArea: { flex: 1 },
});
