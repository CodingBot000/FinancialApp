import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PlatformApiProvider } from '../shared/api';

export default function RootLayout() {
  return (
    <PlatformApiProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </PlatformApiProvider>
  );
}
