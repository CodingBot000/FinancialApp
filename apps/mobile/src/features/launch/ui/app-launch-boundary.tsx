import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { LaunchPermissionSheet } from './launch-permission-sheet';
import { SplashScreen as SplashScreenView } from './splash-screen';
import {
  createSecureLaunchNoticeStore,
  type LaunchNoticeStore,
} from '../model/launch-notice-store';

export const SPLASH_DURATION_MS = 1000;

export type LaunchBiometricMode = 'setup' | 'unlock';

void SplashScreen.preventAutoHideAsync();

export function AppLaunchBoundary({
  children,
  durationMs = SPLASH_DURATION_MS,
  noticeStore,
  onboarding,
  biometric,
  verification,
}: PropsWithChildren<{
  readonly biometric?: (
    mode: LaunchBiometricMode,
    onAuthenticated: () => Promise<void>,
  ) => ReactNode;
  readonly durationMs?: number;
  readonly noticeStore?: LaunchNoticeStore;
  readonly onboarding?: (onComplete: () => void) => ReactNode;
  readonly verification?: (onComplete: () => void) => ReactNode;
}>) {
  const [defaultNoticeStore] = useState(createSecureLaunchNoticeStore);
  const [phase, setPhase] = useState<
    | 'splash'
    | 'notice'
    | 'onboarding'
    | 'verification'
    | 'biometric-setup'
    | 'biometric-unlock'
    | 'ready'
  >('splash');

  const resolvePhase = useCallback(
    ({
      biometricCompleted,
      onboardingCompleted,
      seen,
      verificationCompleted,
    }: {
      readonly biometricCompleted: boolean;
      readonly onboardingCompleted: boolean;
      readonly seen: boolean;
      readonly verificationCompleted: boolean;
    }) => {
      if (!seen) return 'notice' as const;
      if (!onboardingCompleted && onboarding !== undefined)
        return 'onboarding' as const;
      if (!verificationCompleted && verification !== undefined)
        return 'verification' as const;
      if (biometric !== undefined)
        return biometricCompleted
          ? ('biometric-unlock' as const)
          : ('biometric-setup' as const);
      return 'ready' as const;
    },
    [biometric, onboarding, verification],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const store = noticeStore ?? defaultNoticeStore;
      const [
        seen,
        onboardingCompleted,
        verificationCompleted,
        biometricCompleted,
      ] = await Promise.all([
        store.hasSeen(),
        store.hasCompletedOnboarding(),
        store.hasCompletedVerification(),
        store.hasCompletedBiometricSetup(),
      ]);
      if (!active) return;

      await SplashScreen.hideAsync();
      if (!active) return;
      setPhase(
        resolvePhase({
          biometricCompleted,
          onboardingCompleted,
          seen,
          verificationCompleted,
        }),
      );
    }, durationMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [defaultNoticeStore, durationMs, noticeStore, resolvePhase]);

  const continueAfterNotice = async (markSeen: boolean) => {
    const store = noticeStore ?? defaultNoticeStore;
    if (markSeen) {
      await store.markSeen();
    }
    const [onboardingCompleted, verificationCompleted, biometricCompleted] =
      await Promise.all([
        store.hasCompletedOnboarding(),
        store.hasCompletedVerification(),
        store.hasCompletedBiometricSetup(),
      ]);
    setPhase(
      resolvePhase({
        biometricCompleted,
        onboardingCompleted,
        seen: true,
        verificationCompleted,
      }),
    );
  };

  const confirmNotice = () => {
    void continueAfterNotice(true);
  };

  const dismissNotice = () => {
    // Back dismisses the informational sheet without acknowledging it. It
    // will be presented again on the next launch until the user confirms it.
    void continueAfterNotice(false);
  };

  const completeOnboarding = async () => {
    const store = noticeStore ?? defaultNoticeStore;
    await store.markOnboardingCompleted();
    const [verificationCompleted, biometricCompleted] = await Promise.all([
      store.hasCompletedVerification(),
      store.hasCompletedBiometricSetup(),
    ]);
    setPhase(
      resolvePhase({
        biometricCompleted,
        onboardingCompleted: true,
        seen: true,
        verificationCompleted,
      }),
    );
  };

  const completeVerification = async () => {
    await (noticeStore ?? defaultNoticeStore).markVerificationCompleted();
    setPhase(biometric === undefined ? 'ready' : 'biometric-setup');
  };

  const completeBiometricSetup = async () => {
    await (noticeStore ?? defaultNoticeStore).markBiometricSetupCompleted();
    setPhase('ready');
  };

  const completeBiometricUnlock = async () => {
    setPhase('ready');
  };

  if (phase === 'splash') {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreenView />
      </>
    );
  }

  if (phase === 'notice') {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreenView
          bottomBar={
            <LaunchPermissionSheet
              onBack={dismissNotice}
              onConfirm={confirmNotice}
            />
          }
        />
      </>
    );
  }

  if (phase === 'onboarding' && onboarding !== undefined) {
    return (
      <>
        <StatusBar style="dark" />
        {onboarding(completeOnboarding)}
      </>
    );
  }

  if (phase === 'verification' && verification !== undefined) {
    return (
      <>
        <StatusBar style="dark" />
        {verification(completeVerification)}
      </>
    );
  }

  if (phase === 'biometric-setup' && biometric !== undefined) {
    return (
      <>
        <StatusBar style="dark" />
        {biometric('setup', completeBiometricSetup)}
      </>
    );
  }

  if (phase === 'biometric-unlock' && biometric !== undefined) {
    return (
      <>
        <StatusBar style="dark" />
        {biometric('unlock', completeBiometricUnlock)}
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {children}
    </>
  );
}
