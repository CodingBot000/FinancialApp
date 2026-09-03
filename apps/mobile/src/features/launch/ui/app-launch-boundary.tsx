import {
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

void SplashScreen.preventAutoHideAsync();

export function AppLaunchBoundary({
  children,
  durationMs = SPLASH_DURATION_MS,
  noticeStore,
  onboarding,
  verification,
}: PropsWithChildren<{
  readonly durationMs?: number;
  readonly noticeStore?: LaunchNoticeStore;
  readonly onboarding?: (onComplete: () => void) => ReactNode;
  readonly verification?: (onComplete: () => void) => ReactNode;
}>) {
  const [defaultNoticeStore] = useState(createSecureLaunchNoticeStore);
  const [phase, setPhase] = useState<
    'splash' | 'notice' | 'onboarding' | 'verification' | 'ready'
  >('splash');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const store = noticeStore ?? defaultNoticeStore;
      const [seen, onboardingCompleted, verificationCompleted] =
        await Promise.all([
          store.hasSeen(),
          store.hasCompletedOnboarding(),
          store.hasCompletedVerification(),
        ]);
      if (!active) return;

      await SplashScreen.hideAsync();
      if (!active) return;
      setPhase(
        seen
          ? onboardingCompleted || onboarding === undefined
            ? verificationCompleted || verification === undefined
              ? 'ready'
              : 'verification'
            : 'onboarding'
          : 'notice',
      );
    }, durationMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [defaultNoticeStore, durationMs, noticeStore, onboarding, verification]);

  const continueAfterNotice = async (markSeen: boolean) => {
    const store = noticeStore ?? defaultNoticeStore;
    if (markSeen) {
      await store.markSeen();
    }
    const [onboardingCompleted, verificationCompleted] = await Promise.all([
      store.hasCompletedOnboarding(),
      store.hasCompletedVerification(),
    ]);
    setPhase(
      onboardingCompleted
        ? verificationCompleted || verification === undefined
          ? 'ready'
          : 'verification'
        : onboarding === undefined
          ? 'ready'
          : 'onboarding',
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
    const verificationCompleted = await store.hasCompletedVerification();
    setPhase(
      verificationCompleted || verification === undefined
        ? 'ready'
        : 'verification',
    );
  };

  const completeVerification = async () => {
    await (noticeStore ?? defaultNoticeStore).markVerificationCompleted();
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

  return (
    <>
      <StatusBar style="dark" />
      {children}
    </>
  );
}
