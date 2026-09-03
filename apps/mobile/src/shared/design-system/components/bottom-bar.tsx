import { useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '../tokens';

/**
 * A reusable, content-sized bottom surface. The bar intentionally has no
 * fixed height so future actions can add a second row without clipping.
 */
export function BottomBar({
  accessibilityLabel = '하단 메뉴',
  children,
  onBack,
  onLayout,
  style,
  variant = 'navigation',
}: {
  readonly accessibilityLabel?: string;
  readonly children: ReactNode;
  /** Handles Android back while this bottom surface is open. */
  readonly onBack?: () => void;
  readonly onLayout?: (event: LayoutChangeEvent) => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly variant?: 'navigation' | 'sheet';
}) {
  useEffect(() => {
    if (onBack === undefined) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="toolbar"
      onLayout={onLayout}
      style={[styles.base, styles[variant], style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'stretch',
    backgroundColor: colors.surface.primary,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
  },
  navigation: {
    flexDirection: 'row',
    paddingTop: spacing[2],
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'column',
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
  },
});
