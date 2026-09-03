import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifications = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
}));
const linking = vi.hoisted(() => ({
  openSettings: vi.fn(),
  sendIntent: vi.fn(),
}));

vi.mock('expo-notifications', () => notifications);
vi.mock('expo-linking', () => linking);
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: { android: { package: 'com.anonymous.wealthsandbox' } },
  },
}));

import { NotificationInboxScreen } from './notification-inbox-screen';

describe('NotificationInboxScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    linking.openSettings.mockResolvedValue(undefined);
    linking.sendIntent.mockResolvedValue(undefined);
  });

  it('hides the push prompt when system notifications are enabled', async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    const view = await render(<NotificationInboxScreen onBack={vi.fn()} />);

    await waitFor(() => {
      expect(
        view.queryByText(
          '앱 푸시 알림을 켜고 다양한 혜택과 정보를 놓치지 마세요!',
        ),
      ).toBeNull();
    });
    expect(view.queryByRole('button', { name: '알림켜기' })).toBeNull();
  });

  it('shows the prompt and opens system settings when notifications are disabled', async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    const view = await render(<NotificationInboxScreen onBack={vi.fn()} />);

    const button = await view.findByRole('button', { name: '알림켜기' });
    expect(
      view.getByText('앱 푸시 알림을 켜고 다양한 혜택과 정보를 놓치지 마세요!'),
    ).toBeTruthy();
    fireEvent.press(button);

    await waitFor(() =>
      expect(linking.sendIntent).toHaveBeenCalledWith(
        'android.settings.APP_NOTIFICATION_SETTINGS',
        [
          {
            key: 'android.provider.extra.APP_PACKAGE',
            value: 'com.anonymous.wealthsandbox',
          },
        ],
      ),
    );
  });
});
