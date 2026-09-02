import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockBoundary } from '../features/app-lock';
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
      <AuthSessionProvider>
        <LoginBoundary>
          <AppLockBoundary>
            <ConfiguredPlatformApiProvider>
              <MobileQueryProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: colors.background.screen },
                    headerShown: false,
                  }}
                />
              </MobileQueryProvider>
            </ConfiguredPlatformApiProvider>
          </AppLockBoundary>
        </LoginBoundary>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
