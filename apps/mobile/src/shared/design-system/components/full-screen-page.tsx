import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { colors, spacing } from '../tokens';

const FULL_SCREEN_PAGE_HEADER_HEIGHT = 64;

/** A reusable full-screen page for app-owned routes that always have back navigation. */
export function FullScreenPage({
  backIcon,
  children,
  contentContainerStyle,
  onBack,
  title,
  titleStyle,
}: {
  readonly backIcon: ReactNode;
  readonly children: ReactNode;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
  readonly onBack: () => void;
  readonly title: string;
  readonly titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.safeArea}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerSide,
            pressed && styles.pressed,
          ]}
        >
          {backIcon}
        </Pressable>
        <AppText
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.title, titleStyle]}
          variant="heading"
        >
          {title}
        </AppText>
        <View style={styles.headerSide} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: FULL_SCREEN_PAGE_HEADER_HEIGHT,
    paddingHorizontal: spacing[1],
  },
  headerSide: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: { opacity: 0.55 },
  safeArea: { backgroundColor: colors.background.screen, flex: 1 },
  title: { flex: 1, textAlign: 'center' },
});
