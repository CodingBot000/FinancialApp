import * as LocalAuthentication from 'expo-local-authentication';

import type { BiometricGate, BiometricGateResult } from './biometric-gate';

function mapAuthenticationError(
  error: LocalAuthentication.LocalAuthenticationError,
): BiometricGateResult {
  switch (error) {
    case 'app_cancel':
    case 'system_cancel':
    case 'user_cancel':
      return { status: 'cancelled' };
    case 'authentication_failed':
    case 'unable_to_process':
      return {
        reason: 'authentication_failed',
        status: 'retryable-failure',
      };
    case 'timeout':
      return { reason: 'timeout', status: 'retryable-failure' };
    case 'not_enrolled':
      return {
        reason: 'not_enrolled',
        status: 'reauthentication-required',
      };
    case 'lockout':
      return {
        reason: 'locked_out',
        status: 'reauthentication-required',
      };
    case 'user_fallback':
      return {
        reason: 'fallback_requested',
        status: 'reauthentication-required',
      };
    case 'not_available':
    case 'passcode_not_set':
      return {
        reason: 'not_available',
        status: 'reauthentication-required',
      };
    case 'invalid_context':
    case 'no_space':
    case 'unknown':
      return {
        reason: 'system_error',
        status: 'reauthentication-required',
      };
  }
}

export class ExpoBiometricGate implements BiometricGate {
  constructor(
    private readonly prompt: Readonly<{
      description?: string;
      message?: string;
      subtitle?: string;
    }> = {},
  ) {}

  async authenticate(): Promise<BiometricGateResult> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        reason: 'not_available',
        status: 'reauthentication-required',
      };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        reason: 'not_enrolled',
        status: 'reauthentication-required',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: 'strong',
      cancelLabel: '취소',
      disableDeviceFallback: true,
      fallbackLabel: '',
      promptDescription:
        this.prompt.description ??
        '이 인증은 기기 안에서만 앱 잠금을 해제합니다.',
      promptMessage: this.prompt.message ?? 'Wealth Flow 잠금 해제',
      promptSubtitle: this.prompt.subtitle ?? '로컬 생체인증',
      requireConfirmation: true,
    });

    return result.success
      ? { status: 'authenticated' }
      : mapAuthenticationError(result.error);
  }
}
