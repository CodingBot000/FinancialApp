import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
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
// The tab bar owns the bottom system inset. Keeping it out of the scene
// prevents a white safe-area strip from clipping the final scroll content.
const tabSafeAreaEdges: readonly Edge[] = ['right', 'left'];
interface ScreenEnvironment {
  readonly includeTopInset: boolean;
  readonly scrollResetRevision: number;
}

const defaultScreenEnvironment: ScreenEnvironment = {
  includeTopInset: true,
  scrollResetRevision: 0,
};
const ScreenEnvironmentContext = createContext(defaultScreenEnvironment);

export function ScreenSafeAreaProvider({
  children,
  includeTopInset,
  scrollResetRevision = 0,
}: {
  readonly children: ReactNode;
  readonly includeTopInset: boolean;
  readonly scrollResetRevision?: number;
}) {
  const environment = useMemo(
    () => ({ includeTopInset, scrollResetRevision }),
    [includeTopInset, scrollResetRevision],
  );
  return (
    <ScreenEnvironmentContext.Provider value={environment}>
      {children}
    </ScreenEnvironmentContext.Provider>
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
  const { includeTopInset, scrollResetRevision } = useContext(
    ScreenEnvironmentContext,
  );
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!includeTopInset && scroll) {
      scrollRef.current?.scrollTo({ animated: false, y: 0 });
    }
  }, [includeTopInset, scroll, scrollResetRevision]);
  const bottomPadding = includeTopInset
    ? spacing[12]
    : spacing[12] + spacing[8];
  const contentStyle = [
    styles.content,
    { paddingBottom: bottomPadding },
    contentContainerStyle,
  ];

  return (
    <SafeAreaView
      edges={includeTopInset ? allSafeAreaEdges : tabSafeAreaEdges}
      style={styles.safe}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[...contentStyle, styles.flex]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
  flex: { flex: 1 },
  safe: { backgroundColor: colors.background.screen, flex: 1 },
});
