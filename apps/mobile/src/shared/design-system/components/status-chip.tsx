import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from '../tokens';
import { displayLabel } from '../../format/display-labels';

export function StatusChip({ status }: { readonly status: string }) {
  const tone =
    status === 'FAILED' || status === 'REJECTED'
      ? 'danger'
      : status === 'STALE'
        ? 'warning'
        : status === 'FILLED' || status === 'COMPLETED' || status === 'FRESH'
          ? 'success'
          : 'secondary';
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor:
            tone === 'danger'
              ? colors.surface.danger
              : tone === 'warning'
                ? colors.surface.warning
                : tone === 'success'
                  ? colors.surface.success
                  : colors.surface.primary,
          borderColor:
            tone === 'secondary' ? colors.border.subtle : 'transparent',
        },
      ]}
    >
      <AppText tone={tone} variant="caption">
        {displayLabel(status)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
});
