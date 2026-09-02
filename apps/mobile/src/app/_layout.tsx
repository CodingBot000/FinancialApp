import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockBoundary } from '../features/app-lock';
import { AppLaunchBoundary } from '../features/launch';
import {
  OnboardingScreen,
  PhoneVerificationScreen,
} from '../features/onboarding';
import {
  ConfiguredPlatformApiProvider,
  LoginBoundary,
} from '../features/login';
import { AuthSessionProvider } from '../shared/auth';
import { MobileQueryProvider } from '../shared/query';
import { colors } from '../shared/design-system';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppLaunchBoundary
        onboarding={(onComplete) => (
          <OnboardingScreen onComplete={onComplete} />
        )}
        verification={(onComplete) => (
          <PhoneVerificationScreen onComplete={onComplete} />
        )}
      >
        <AuthSessionProvider>
          <LoginBoundary>
            <AppLockBoundary>
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
            </AppLockBoundary>
          </LoginBoundary>
        </AuthSessionProvider>
      </AppLaunchBoundary>
    </SafeAreaProvider>
  );
}
