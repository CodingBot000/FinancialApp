import * as SecureStore from 'expo-secure-store';

const LAUNCH_NOTICE_SEEN_KEY = 'wealth-flow.launch-notice-seen.v1';

export interface LaunchNoticeStore {
  hasCompletedOnboarding(): Promise<boolean>;
  hasCompletedVerification(): Promise<boolean>;
  hasSeen(): Promise<boolean>;
  markOnboardingCompleted(): Promise<void>;
  markVerificationCompleted(): Promise<void>;
  markSeen(): Promise<void>;
}

export function createSecureLaunchNoticeStore(): LaunchNoticeStore {
  return {
    async hasCompletedOnboarding() {
      try {
        return (
          (await SecureStore.getItemAsync(
            'wealth-flow.onboarding-completed.v1',
          )) === 'true'
        );
      } catch {
        return false;
      }
    },
    async hasCompletedVerification() {
      try {
        return (
          (await SecureStore.getItemAsync(
            'wealth-flow.verification-completed.v1',
          )) === 'true'
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
    async markOnboardingCompleted() {
      try {
        await SecureStore.setItemAsync(
          'wealth-flow.onboarding-completed.v1',
          'true',
        );
      } catch {
        // Continue when a platform has no usable secure storage.
      }
    },
    async markVerificationCompleted() {
      try {
        await SecureStore.setItemAsync(
          'wealth-flow.verification-completed.v1',
          'true',
        );
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
