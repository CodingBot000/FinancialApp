import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, spacing } from '../tokens';

export function ListRow({
  description,
  leading,
  onPress,
  selected = false,
  title,
  trailing,
}: {
  readonly description?: string;
  readonly leading?: ReactNode;
  readonly onPress?: () => void;
  readonly selected?: boolean;
  readonly title: string;
  readonly trailing?: ReactNode;
}) {
  const content = (
    <View style={[styles.row, selected && styles.selected]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.main}>
        <AppText variant="bodyStrong">{title}</AppText>
        {description ? (
          <AppText tone="secondary" variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  leading: { marginRight: spacing[3] },
  main: { flex: 1, gap: spacing[1] },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingVertical: spacing[3],
  },
  selected: { backgroundColor: colors.surface.warm },
  trailing: { marginLeft: spacing[3] },
});
