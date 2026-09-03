import { StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { spacing } from '../tokens';

export function DemoDisclosure({
  children = '데이터는 실제 증권사 데이터 기반입니다.',
}: {
  readonly children?: string;
}) {
  return (
    <AppText style={styles.text} tone="secondary" variant="legal">
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({ text: { marginTop: spacing[4] } });
