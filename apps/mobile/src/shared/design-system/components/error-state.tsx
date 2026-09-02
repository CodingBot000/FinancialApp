import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { spacing } from '../tokens';

export function ErrorState({
  action,
  description = '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
  title = '정보를 불러오지 못했습니다.',
}: {
  readonly action?: ReactNode;
  readonly description?: string;
  readonly title?: string;
}) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <AppText tone="danger" variant="heading">
        {title}
      </AppText>
      <AppText style={styles.description} tone="secondary" variant="body">
        {description}
      </AppText>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing[4] },
  container: { alignItems: 'center', padding: spacing[6] },
  description: { marginTop: spacing[2], textAlign: 'center' },
});
