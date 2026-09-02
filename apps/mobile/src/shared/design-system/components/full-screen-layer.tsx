import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { colors, spacing } from '../tokens';

export function FullScreenLayer({
  backIcon,
  children,
  contentStyle,
  onBack,
  title,
}: {
  readonly backIcon: ReactNode;
  readonly children: ReactNode;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly onBack: () => void;
  readonly title: string;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
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
          style={styles.title}
          variant="heading"
        >
          {title}
        </AppText>
        <View style={styles.headerSide} />
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 64,
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
