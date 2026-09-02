import type { BiometricGate, BiometricGateResult } from './biometric-gate';

/** Local-only biometric bypass for development UI testing. */
export class LocalTestBiometricGate implements BiometricGate {
  async authenticate(): Promise<BiometricGateResult> {
    return { status: 'authenticated' };
  }
}
