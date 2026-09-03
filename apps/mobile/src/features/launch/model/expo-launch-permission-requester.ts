import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  createLaunchPermissionRequester,
  type LaunchPermissionAdapter,
  type LaunchPermissionRequester,
} from './launch-permission-requester';

function permissionState(permission: {
  readonly canAskAgain: boolean;
  readonly granted: boolean;
  readonly status: string;
}) {
  return permission.status === 'undetermined' ||
    (!permission.granted && permission.canAskAgain)
    ? ('undetermined' as const)
    : ('determined' as const);
}

const notificationsPermission: LaunchPermissionAdapter = {
  kind: 'notifications',
  async getState() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        importance: Notifications.AndroidImportance.DEFAULT,
        name: '기본 알림',
      });
    }
    return permissionState(await Notifications.getPermissionsAsync());
  },
  async request() {
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  },
};

const photosPermission: LaunchPermissionAdapter = {
  kind: 'photos',
  async getState() {
    return permissionState(await ImagePicker.getMediaLibraryPermissionsAsync());
  },
  async request() {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  },
};

const cameraPermission: LaunchPermissionAdapter = {
  kind: 'camera',
  async getState() {
    return permissionState(await Camera.getCameraPermissionsAsync());
  },
  async request() {
    await Camera.requestCameraPermissionsAsync();
  },
};

export function createExpoLaunchPermissionRequester(): LaunchPermissionRequester {
  return createLaunchPermissionRequester(
    Platform.OS === 'web'
      ? []
      : [notificationsPermission, photosPermission, cameraPermission],
  );
}
