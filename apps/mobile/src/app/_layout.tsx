import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PlatformApiProvider } from '../shared/api';
import { MobileQueryProvider } from '../shared/query';

export default function RootLayout() {
  return (
    <PlatformApiProvider>
      <MobileQueryProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </MobileQueryProvider>
    </PlatformApiProvider>
  );
}
