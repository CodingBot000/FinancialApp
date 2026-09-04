import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { Card } from './card';
import { colors, radius, spacing } from '../tokens';

export type SkeletonBlockHeight = 'button' | 'card' | 'text' | 'title';

const blockHeights: Readonly<Record<SkeletonBlockHeight, number>> = {
  button: spacing[12],
  card: spacing[16] * 2,
  text: spacing[4],
  title: spacing[8],
};

export function SkeletonBlock({
  height = 'text',
  style,
  width = '100%',
  ...props
}: ViewProps & {
  readonly height?: SkeletonBlockHeight;
  readonly style?: StyleProp<ViewStyle>;
  readonly width?: DimensionValue;
}) {
  return (
    <View
      {...props}
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no"
      style={[styles.block, { height: blockHeights[height], width }, style]}
    />
  );
}

const cardLines = [
  ['42%', '88%', '68%'],
  ['36%', '92%', '76%'],
  ['48%', '84%', '64%'],
] as const;

export function TabScreenSkeleton({
  style,
}: {
  readonly style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityLabel="화면을 준비하고 있어요."
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessible
      style={[styles.container, style]}
    >
      <SkeletonBlock height="title" width="42%" />
      <SkeletonBlock width="78%" />
      {cardLines.map(([titleWidth, primaryWidth, secondaryWidth]) => (
        <Card key={titleWidth} style={styles.card}>
          <SkeletonBlock height="title" width={titleWidth} />
          <SkeletonBlock width={primaryWidth} />
          <SkeletonBlock width={secondaryWidth} />
          <SkeletonBlock height="button" />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.small,
  },
  card: { minHeight: blockHeights.card },
  container: {
    backgroundColor: colors.background.screen,
    flex: 1,
    gap: spacing[4],
    paddingBottom: spacing[12] + spacing[8],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
});
