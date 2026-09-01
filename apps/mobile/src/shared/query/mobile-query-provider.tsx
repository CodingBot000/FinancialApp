import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from '@tanstack/react-query';
import * as Network from 'expo-network';

import { createMobileQueryClient } from './query-client';
import {
  createOnlineEventListener,
  installAppFocusListener,
} from './native-query-lifecycle';

export function MobileQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createMobileQueryClient);

  useEffect(
    () =>
      installAppFocusListener({
        appState: AppState,
        isWeb: Platform.OS === 'web',
        setFocused: (focused) => focusManager.setFocused(focused),
      }),
    [],
  );

  useEffect(() => {
    onlineManager.setEventListener(createOnlineEventListener(Network));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
