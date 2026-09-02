import { StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { spacing } from '../tokens';

export function DemoDisclosure({
  children = '데이터는 포트폴리오 시연을 위한 예시이며 실제 금융계좌와 연결되지 않습니다.',
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
