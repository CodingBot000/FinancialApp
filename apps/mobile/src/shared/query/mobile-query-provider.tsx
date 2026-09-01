import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from '@tanstack/react-query';
import * as Network from 'expo-network';

import { useAuthSession } from '../auth';
import { createMobileQueryClient } from './query-client';
import {
  createOnlineEventListener,
  installAppFocusListener,
} from './native-query-lifecycle';
import { installSessionCacheClear } from './session-cache-lifecycle';

export function MobileQueryProvider({ children }: PropsWithChildren) {
  const session = useAuthSession();
  const [queryClient] = useState(createMobileQueryClient);

  useEffect(
    () =>
      installSessionCacheClear({
        clear: () => queryClient.clear(),
        session,
      }),
    [queryClient, session],
  );

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
