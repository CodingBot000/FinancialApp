import * as SecureStore from 'expo-secure-store';

const LAUNCH_NOTICE_SEEN_KEY = 'wealth-flow.launch-notice-seen.v1';
const ONBOARDING_COMPLETED_KEY = 'wealth-flow.onboarding-completed.v1';
const VERIFICATION_COMPLETED_KEY = 'wealth-flow.verification-completed.v1';
const BIOMETRIC_SETUP_COMPLETED_KEY =
  'wealth-flow.biometric-setup-completed.v1';
const LAUNCH_PERMISSIONS_HANDLED_KEY =
  'wealth-flow.launch-permissions-handled.v1';

export interface LaunchNoticeStore {
  clearPortfolioSetup(): Promise<void>;
  hasCompletedBiometricSetup(): Promise<boolean>;
  hasCompletedOnboarding(): Promise<boolean>;
  hasCompletedVerification(): Promise<boolean>;
  hasHandledPermissions(): Promise<boolean>;
  hasSeen(): Promise<boolean>;
  markBiometricSetupCompleted(): Promise<void>;
  markOnboardingCompleted(): Promise<void>;
  markPermissionsHandled(): Promise<void>;
  markVerificationCompleted(): Promise<void>;
  markSeen(): Promise<void>;
}

export function createSecureLaunchNoticeStore(): LaunchNoticeStore {
  return {
    async clearPortfolioSetup() {
      await Promise.all([
        SecureStore.deleteItemAsync(LAUNCH_NOTICE_SEEN_KEY),
        SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY),
        SecureStore.deleteItemAsync(VERIFICATION_COMPLETED_KEY),
        SecureStore.deleteItemAsync(BIOMETRIC_SETUP_COMPLETED_KEY),
        SecureStore.deleteItemAsync(LAUNCH_PERMISSIONS_HANDLED_KEY),
      ]);
    },
    async hasCompletedBiometricSetup() {
      try {
        return (
          (await SecureStore.getItemAsync(BIOMETRIC_SETUP_COMPLETED_KEY)) ===
          'true'
        );
      } catch {
        return false;
      }
    },
    async hasCompletedOnboarding() {
      try {
        return (
          (await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY)) === 'true'
        );
      } catch {
        return false;
      }
    },
    async hasCompletedVerification() {
      try {
        return (
          (await SecureStore.getItemAsync(VERIFICATION_COMPLETED_KEY)) ===
          'true'
        );
      } catch {
        return false;
      }
    },
    async hasHandledPermissions() {
      try {
        return (
          (await SecureStore.getItemAsync(LAUNCH_PERMISSIONS_HANDLED_KEY)) ===
          'true'
        );
      } catch {
        return false;
      }
    },
    async hasSeen() {
      try {
        return (
          (await SecureStore.getItemAsync(LAUNCH_NOTICE_SEEN_KEY)) === 'true'
        );
      } catch {
        return false;
      }
    },
    async markBiometricSetupCompleted() {
      await SecureStore.setItemAsync(BIOMETRIC_SETUP_COMPLETED_KEY, 'true');
    },
    async markOnboardingCompleted() {
      try {
        await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
      } catch {
        // Continue when a platform has no usable secure storage.
      }
    },
    async markPermissionsHandled() {
      try {
        await SecureStore.setItemAsync(LAUNCH_PERMISSIONS_HANDLED_KEY, 'true');
      } catch {
        // Permission results never block the optional launch flow.
      }
    },
    async markVerificationCompleted() {
      try {
        await SecureStore.setItemAsync(VERIFICATION_COMPLETED_KEY, 'true');
      } catch {
        // Continue when a platform has no usable secure storage.
      }
    },
    async markSeen() {
      try {
        await SecureStore.setItemAsync(LAUNCH_NOTICE_SEEN_KEY, 'true');
      } catch {
        // Continue when a platform has no usable secure storage.
      }
    },
  };
}
