import { beforeEach, describe, expect, it, vi } from 'vitest';

const camera = vi.hoisted(() => ({
  getCameraPermissionsAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(),
}));
const imagePicker = vi.hoisted(() => ({
  getMediaLibraryPermissionsAsync: vi.fn(),
  requestMediaLibraryPermissionsAsync: vi.fn(),
}));
const notifications = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
}));

vi.mock('expo-camera', () => ({ Camera: camera }));
vi.mock('expo-image-picker', () => imagePicker);
vi.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  ...notifications,
}));

import { createExpoLaunchPermissionRequester } from './expo-launch-permission-requester';

describe('Expo launch permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifications.setNotificationChannelAsync.mockResolvedValue(null);
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });
    imagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });
    camera.requestCameraPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });
  });

  it('creates the Android channel and requests only undetermined permissions', async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      granted: false,
      status: 'denied',
    });
    imagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
      canAskAgain: false,
      granted: false,
      status: 'denied',
    });
    camera.getCameraPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      granted: false,
      status: 'undetermined',
    });

    await expect(
      createExpoLaunchPermissionRequester().requestPendingPermissions(),
    ).resolves.toEqual([
      { kind: 'notifications', outcome: 'requested' },
      { kind: 'photos', outcome: 'already-determined' },
      { kind: 'camera', outcome: 'requested' },
    ]);
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      { importance: 3, name: '기본 알림' },
    );
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledOnce();
    expect(
      imagePicker.requestMediaLibraryPermissionsAsync,
    ).not.toHaveBeenCalled();
    expect(camera.requestCameraPermissionsAsync).toHaveBeenCalledOnce();
    expect(
      notifications.setNotificationChannelAsync.mock.invocationCallOrder[0],
    ).toBeLessThan(
      notifications.requestPermissionsAsync.mock.invocationCallOrder[0]!,
    );
  });
});
