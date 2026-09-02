import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  colors,
  FullScreenLayer,
  spacing,
} from '../../../shared/design-system';

const keepNotificationActionInactive = () => undefined;

export function NotificationInboxScreen({
  onBack,
}: {
  readonly onBack: () => void;
}) {
  return (
    <FullScreenLayer
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      onBack={onBack}
      title="알림함"
    >
      <View style={styles.emptyState}>
        <Ionicons
          color={colors.border.subtle}
          name="notifications-outline"
          size={76}
        />
        <AppText style={styles.centered} variant="title1">
          아직 받은 메시지가 없어요
        </AppText>
        <AppText style={styles.centered} variant="caption">
          앱 푸시 알림을 켜고 다양한 혜택과 정보를 놓치지 마세요!
        </AppText>
        <View style={styles.action}>
          <Button
            accessibilityLabel="알림켜기, 준비 중"
            onPress={keepNotificationActionInactive}
            size="medium"
            style={styles.actionButton}
          >
            알림켜기
          </Button>
        </View>
      </View>
    </FullScreenLayer>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: spacing[2] },
  actionButton: { minWidth: 84 },
  centered: { textAlign: 'center' },
  emptyState: {
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
    paddingTop: '34%',
  },
});
