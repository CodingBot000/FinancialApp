export type BiometricRetryReason = 'authentication_failed' | 'timeout';

export type BiometricReauthenticationReason =
  | 'fallback_requested'
  | 'locked_out'
  | 'not_available'
  | 'not_enrolled'
  | 'system_error';

export type BiometricGateResult =
  | Readonly<{ status: 'authenticated' }>
  | Readonly<{ status: 'cancelled' }>
  | Readonly<{
      reason: BiometricRetryReason;
      status: 'retryable-failure';
    }>
  | Readonly<{
      reason: BiometricReauthenticationReason;
      status: 'reauthentication-required';
    }>;

export interface BiometricGate {
  authenticate(): Promise<BiometricGateResult>;
}
