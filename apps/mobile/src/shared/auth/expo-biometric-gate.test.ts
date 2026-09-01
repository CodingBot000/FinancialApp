import { beforeEach, describe, expect, it, vi } from 'vitest';

const localAuthentication = vi.hoisted(() => ({
  authenticateAsync: vi.fn(),
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
}));

vi.mock('expo-local-authentication', () => localAuthentication);

import { ExpoBiometricGate } from './expo-biometric-gate';

describe('ExpoBiometricGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localAuthentication.hasHardwareAsync.mockResolvedValue(true);
    localAuthentication.isEnrolledAsync.mockResolvedValue(true);
  });

  it('requires enrolled hardware and Android strong biometrics', async () => {
    localAuthentication.authenticateAsync.mockResolvedValue({ success: true });

    await expect(new ExpoBiometricGate().authenticate()).resolves.toEqual({
      status: 'authenticated',
    });
    expect(localAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        biometricsSecurityLevel: 'strong',
        disableDeviceFallback: true,
      }),
    );
  });

  it('requires reauthentication when biometrics are not enrolled', async () => {
    localAuthentication.isEnrolledAsync.mockResolvedValue(false);

    await expect(new ExpoBiometricGate().authenticate()).resolves.toEqual({
      reason: 'not_enrolled',
      status: 'reauthentication-required',
    });
    expect(localAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['user_cancel', { status: 'cancelled' }],
    [
      'authentication_failed',
      { reason: 'authentication_failed', status: 'retryable-failure' },
    ],
    ['lockout', { reason: 'locked_out', status: 'reauthentication-required' }],
  ] as const)(
    'maps %s without exposing platform details',
    async (error, state) => {
      localAuthentication.authenticateAsync.mockResolvedValue({
        error,
        success: false,
      });

      await expect(new ExpoBiometricGate().authenticate()).resolves.toEqual(
        state,
      );
    },
  );
});
