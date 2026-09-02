import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { spacing } from '../tokens';

export function EmptyState({
  action,
  description,
  title,
}: {
  readonly action?: ReactNode;
  readonly description?: string;
  readonly title: string;
}) {
  return (
    <View style={styles.container}>
      <AppText variant="heading">{title}</AppText>
      {description ? (
        <AppText style={styles.description} tone="secondary" variant="body">
          {description}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing[4] },
  container: { alignItems: 'center', padding: spacing[6] },
  description: { marginTop: spacing[2], textAlign: 'center' },
});
