import { createContext, type ReactNode, useContext } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../tokens';

const allSafeAreaEdges: readonly Edge[] = ['top', 'right', 'bottom', 'left'];
const tabSafeAreaEdges: readonly Edge[] = ['right', 'bottom', 'left'];
const ScreenTopInsetContext = createContext(true);

export function ScreenSafeAreaProvider({
  children,
  includeTopInset,
}: {
  readonly children: ReactNode;
  readonly includeTopInset: boolean;
}) {
  return (
    <ScreenTopInsetContext.Provider value={includeTopInset}>
      {children}
    </ScreenTopInsetContext.Provider>
  );
}

export function Screen({
  children,
  contentContainerStyle,
  scroll = true,
}: {
  readonly children: ReactNode;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
  readonly scroll?: boolean;
}) {
  const includeTopInset = useContext(ScreenTopInsetContext);

  return (
    <SafeAreaView
      edges={includeTopInset ? allSafeAreaEdges : tabSafeAreaEdges}
      style={styles.safe}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
  flex: { flex: 1 },
  safe: { backgroundColor: colors.background.screen, flex: 1 },
});
