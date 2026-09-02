import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

export function SectionHeader({
  action,
  title,
}: {
  readonly action?: ReactNode;
  readonly title: string;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="heading">{title}</AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
