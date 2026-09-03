import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface DeviceRuntime {
  isPhysicalDevice(): boolean;
}

export const expoDeviceRuntime: DeviceRuntime = {
  isPhysicalDevice: () => Platform.OS !== 'web' && Device.isDevice,
};
