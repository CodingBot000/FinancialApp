import type { BiometricGate, BiometricGateResult } from './biometric-gate';

/** Non-physical-device biometric adapter for portfolio UI testing. */
export class LocalTestBiometricGate implements BiometricGate {
  async authenticate(): Promise<BiometricGateResult> {
    return { status: 'authenticated' };
  }
}
