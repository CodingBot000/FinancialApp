import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppLockBoundary } from '../features/app-lock';
import { LoginBoundary } from '../features/login';
import { PlatformApiProvider } from '../shared/api';
import { AuthSessionProvider } from '../shared/auth';
import { MobileQueryProvider } from '../shared/query';

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <LoginBoundary>
        <AppLockBoundary>
          <PlatformApiProvider>
            <MobileQueryProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }} />
            </MobileQueryProvider>
          </PlatformApiProvider>
        </AppLockBoundary>
      </LoginBoundary>
    </AuthSessionProvider>
  );
}
