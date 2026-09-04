import { describe, expect, it, vi } from 'vitest';

const notifications = vi.hoisted(() => ({
  scheduleNotificationAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
}));

vi.mock('expo-notifications', () => ({
  ...notifications,
  AndroidImportance: { HIGH: 4 },
}));

import { ExpoLocalNotificationService } from './expo-local-notification-service';

describe('ExpoLocalNotificationService', () => {
  it('configures a high-importance Android consultation channel', async () => {
    notifications.setNotificationChannelAsync.mockResolvedValue(null);
    const service = new ExpoLocalNotificationService();

    await service.configure();

    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'consultation',
      {
        importance: 4,
        name: '상담 알림',
        sound: null,
        vibrationPattern: [0, 250],
      },
    );
  });

  it('schedules an immediate local notification with payload data', async () => {
    notifications.scheduleNotificationAsync.mockResolvedValue(
      'notification-id',
    );
    const service = new ExpoLocalNotificationService();

    await expect(
      service.schedule({
        body: '전화 상담 · 오늘 19:00',
        data: { type: 'consultation-requested' },
        title: '상담 요청되었습니다',
      }),
    ).resolves.toBe('notification-id');
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        body: '전화 상담 · 오늘 19:00',
        data: { type: 'consultation-requested' },
        sound: false,
        title: '상담 요청되었습니다',
      },
      trigger: { channelId: 'consultation' },
    });
  });
});
