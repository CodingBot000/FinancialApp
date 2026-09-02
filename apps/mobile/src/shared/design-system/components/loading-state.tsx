import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, spacing } from '../tokens';

export function LoadingState({
  label = '정보를 불러오고 있어요.',
}: {
  readonly label?: string;
}) {
  return (
    <View accessibilityLabel={label} style={styles.container}>
      <ActivityIndicator color={colors.brand.primary} />
      <AppText tone="secondary" variant="body">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[3],
    justifyContent: 'center',
    minHeight: 160,
    padding: spacing[6],
  },
});
