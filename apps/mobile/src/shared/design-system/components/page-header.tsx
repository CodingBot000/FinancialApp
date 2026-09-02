import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { spacing } from '../tokens';

export function PageHeader({
  action,
  subtitle,
  title,
}: {
  readonly action?: ReactNode;
  readonly subtitle?: string;
  readonly title: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <AppText accessibilityRole="header" variant="title1">
          {title}
        </AppText>
        {action}
      </View>
      {subtitle ? (
        <AppText style={styles.subtitle} tone="secondary" variant="body">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing[1] },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitle: { marginTop: spacing[2] },
});
