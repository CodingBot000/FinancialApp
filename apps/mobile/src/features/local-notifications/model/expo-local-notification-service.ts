import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  LocalNotificationInput,
  LocalNotificationService,
} from './local-notification';

const CONSULTATION_CHANNEL_ID = 'consultation';

export class ExpoLocalNotificationService implements LocalNotificationService {
  async configure() {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(CONSULTATION_CHANNEL_ID, {
      importance: Notifications.AndroidImportance.HIGH,
      name: '상담 알림',
      sound: null,
      vibrationPattern: [0, 250],
    });
  }

  schedule(input: LocalNotificationInput) {
    return Notifications.scheduleNotificationAsync({
      content: {
        body: input.body,
        sound: false,
        title: input.title,
        ...(input.data ? { data: input.data } : {}),
      },
      trigger: { channelId: CONSULTATION_CHANNEL_ID },
    });
  }
}

export function createExpoLocalNotificationService() {
  return new ExpoLocalNotificationService();
}
