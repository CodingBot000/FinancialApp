import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';

import { HttpPlatformApi } from './http-platform-api';
import { ContractMockPlatformApi } from './mock/contract-mock-platform-api';
import type { PlatformApi } from './platform-api';

const PlatformApiContext = createContext<PlatformApi | undefined>(undefined);

function createConfiguredPlatformApi(): PlatformApi {
  const apiMode =
    process.env.EXPO_PUBLIC_PLATFORM_API_MODE ?? (__DEV__ ? 'mock' : 'http');

  if (apiMode === 'mock') {
    return new ContractMockPlatformApi();
  }

  const baseUrl = process.env.EXPO_PUBLIC_PLATFORM_API_URL;
  if (baseUrl === undefined || baseUrl.length === 0) {
    throw new Error(
      'EXPO_PUBLIC_PLATFORM_API_URL is required when API mode is http.',
    );
  }

  return new HttpPlatformApi({ baseUrl });
}

export function PlatformApiProvider({
  api,
  children,
}: PropsWithChildren<{ readonly api?: PlatformApi }>) {
  const value = useMemo(() => api ?? createConfiguredPlatformApi(), [api]);
  return (
    <PlatformApiContext.Provider value={value}>
      {children}
    </PlatformApiContext.Provider>
  );
}

export function usePlatformApi() {
  const api = useContext(PlatformApiContext);
  if (api === undefined) {
    throw new Error('usePlatformApi must be used inside PlatformApiProvider.');
  }
  return api;
}
