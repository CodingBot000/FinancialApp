import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Platform } from 'react-native';

import {
  AppText,
  Button,
  colors,
  FullScreenPage,
  ListRow,
  spacing,
} from '../../../shared/design-system';
import {
  mockNotifications,
  type MockNotification,
} from '../model/mock-notifications';

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
    <FullScreenPage
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      contentContainerStyle={styles.content}
      onBack={onBack}
      title="알림함"
    >
      {notificationsEnabled === false ? (
        <View style={styles.permissionPrompt}>
          <AppText style={styles.permissionCopy} tone="secondary">
            앱 푸시 알림을 켜고 다양한 혜택과 정보를 놓치지 마세요!
          </AppText>
          <Button
            accessibilityLabel="알림켜기"
            onPress={() => void openNotificationSettings()}
            size="medium"
            style={styles.actionButton}
          >
            알림켜기
          </Button>
        </View>
      ) : null}

      <View style={styles.listHeader}>
        <AppText variant="heading">최근 알림</AppText>
        <AppText tone="secondary" variant="caption">
          {mockNotifications.length}건
        </AppText>
      </View>

      <View accessibilityLabel="알림 목록">
        {mockNotifications.map((item) => (
          <NotificationRow item={item} key={item.id} />
        ))}
      </View>
    </FullScreenPage>
  );
}

function NotificationRow({ item }: { readonly item: MockNotification }) {
  return (
    <ListRow
      description={item.body}
      leading={
        <View style={styles.leading}>
          <Ionicons
            color={colors.brand.primary}
            name={iconByType[item.type]}
            size={24}
          />
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </View>
      }
      title={item.title}
      trailing={
        <AppText tone="tertiary" variant="legal">
          {item.date}
        </AppText>
      }
    />
  );
}

const iconByType: Record<
  MockNotification['type'],
  ComponentProps<typeof Ionicons>['name']
> = {
  asset: 'wallet-outline',
  plan: 'analytics-outline',
  service: 'information-circle-outline',
  trade: 'receipt-outline',
};

const styles = StyleSheet.create({
  actionButton: { alignSelf: 'flex-start', minWidth: 84 },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
  leading: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    width: 32,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  permissionCopy: { flex: 1 },
  permissionPrompt: {
    alignItems: 'center',
    backgroundColor: colors.surface.subtle,
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  unreadDot: {
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 8,
  },
});
