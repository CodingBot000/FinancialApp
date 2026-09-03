import { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  BiometricAccessScreen,
  PortfolioAccessBoundary,
} from '../features/app-lock';
import {
  AppLaunchBoundary,
  createSecureLaunchNoticeStore,
  type LaunchBiometricMode,
} from '../features/launch';
import {
  OnboardingScreen,
  PhoneVerificationScreen,
} from '../features/onboarding';
import {
  ConfiguredPlatformApiProvider,
  LoginBoundary,
} from '../features/login';
import { AuthSessionProvider, PortfolioAccessProvider } from '../shared/auth';
import { MobileQueryProvider } from '../shared/query';
import { colors } from '../shared/design-system';

export default function RootLayout() {
  const [launchRevision, setLaunchRevision] = useState(0);
  const [launchStore] = useState(createSecureLaunchNoticeStore);
  const resetPortfolioSetup = useCallback(async () => {
    await launchStore.clearPortfolioSetup();
    setLaunchRevision((current) => current + 1);
  }, [launchStore]);

  const renderBiometric = useCallback(
    (mode: LaunchBiometricMode, onAuthenticated: () => Promise<void>) => (
      <BiometricAccessScreen mode={mode} onAuthenticated={onAuthenticated} />
    ),
    [],
  );

  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <PortfolioAccessProvider onReset={resetPortfolioSetup}>
          <AppLaunchBoundary
            biometric={renderBiometric}
            key={launchRevision}
            noticeStore={launchStore}
            onboarding={(onComplete) => (
              <OnboardingScreen onComplete={onComplete} />
            )}
            verification={(onComplete) => (
              <PhoneVerificationScreen onComplete={onComplete} />
            )}
          >
            <PortfolioAccessBoundary>
              <LoginBoundary>
                <ConfiguredPlatformApiProvider>
                  <MobileQueryProvider>
                    <Stack
                      screenOptions={{
                        contentStyle: {
                          backgroundColor: colors.background.screen,
                        },
                        headerShown: false,
                      }}
                    >
                      <Stack.Screen
                        name="notifications"
                        options={{
                          animation: 'slide_from_right',
                          presentation: 'card',
                        }}
                      />
                    </Stack>
                  </MobileQueryProvider>
                </ConfiguredPlatformApiProvider>
              </LoginBoundary>
            </PortfolioAccessBoundary>
          </AppLaunchBoundary>
        </PortfolioAccessProvider>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
