import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';

import { ContractMockPlatformApi } from './mock/contract-mock-platform-api';
import type { PlatformApi } from './platform-api';

const PlatformApiContext = createContext<PlatformApi | undefined>(undefined);

export function PlatformApiProvider({
  api,
  children,
}: PropsWithChildren<{ readonly api?: PlatformApi }>) {
  const value = useMemo(() => api ?? new ContractMockPlatformApi(), [api]);
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
