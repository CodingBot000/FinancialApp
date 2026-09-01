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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <LoginBoundary>
          <AppLockBoundary>
            <ConfiguredPlatformApiProvider>
              <MobileQueryProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }} />
              </MobileQueryProvider>
            </ConfiguredPlatformApiProvider>
          </AppLockBoundary>
        </LoginBoundary>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
