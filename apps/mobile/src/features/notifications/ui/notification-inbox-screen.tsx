import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Platform } from 'react-native';

import {
  AppText,
  Button,
  colors,
  FullScreenLayer,
  spacing,
} from '../../../shared/design-system';

export function NotificationInboxScreen({
  onBack,
}: {
  readonly onBack: () => void;
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | undefined
  >();

  useEffect(() => {
    let mounted = true;
    void Notifications.getPermissionsAsync()
      .then((permission) => {
        if (mounted) setNotificationsEnabled(permission.granted);
      })
      .catch(() => {
        if (mounted) setNotificationsEnabled(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openNotificationSettings = async () => {
    if (Platform.OS === 'android') {
      const packageName = Constants.expoConfig?.android?.package;
      if (packageName) {
        try {
          await Linking.sendIntent(
            'android.settings.APP_NOTIFICATION_SETTINGS',
            [
              {
                key: 'android.provider.extra.APP_PACKAGE',
                value: packageName,
              },
            ],
          );
          return;
        } catch {
          // Fall back to the app settings page when the direct intent is unavailable.
        }
      }
    }
    await Linking.openSettings();
  };

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
        {!notificationsEnabled ? (
          <>
            <AppText style={styles.centered} variant="caption">
              앱 푸시 알림을 켜고 다양한 혜택과 정보를 놓치지 마세요!
            </AppText>
            <View style={styles.action}>
              <Button
                accessibilityLabel="알림켜기"
                onPress={() => void openNotificationSettings()}
                size="medium"
                style={styles.actionButton}
              >
                알림켜기
              </Button>
            </View>
          </>
        ) : null}
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
