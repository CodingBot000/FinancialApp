import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../tokens';

export function Screen({
  children,
  contentContainerStyle,
  scroll = true,
}: {
  readonly children: ReactNode;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
  readonly scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe}>
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
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
  flex: { flex: 1 },
  safe: { backgroundColor: colors.background.screen, flex: 1 },
});
