import type { BiometricGate } from './biometric-gate';
import type { DeviceRuntime } from './device-runtime';
import { expoDeviceRuntime } from './device-runtime';
import { ExpoBiometricGate } from './expo-biometric-gate';
import { LocalTestBiometricGate } from './local-test-biometric-gate';

type PortfolioBiometricGateOptions = Readonly<{
  deviceRuntime?: DeviceRuntime;
  nonPhysicalGate?: BiometricGate;
  physicalGate?: BiometricGate;
}>;

export function createPortfolioBiometricGate(
  options: PortfolioBiometricGateOptions = {},
): BiometricGate {
  const runtime = options.deviceRuntime ?? expoDeviceRuntime;
  if (runtime.isPhysicalDevice()) {
    return options.physicalGate ?? new ExpoBiometricGate();
  }

  return options.nonPhysicalGate ?? new LocalTestBiometricGate();
}
