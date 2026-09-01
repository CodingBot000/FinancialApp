import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { MemoryAccessTokenStore } from './access-token-store';
import { AuthSessionManager } from './auth-session-manager';
import { ExpoSecureRefreshTokenStore } from './expo-secure-refresh-token-store';

const AuthSessionContext = createContext<AuthSessionManager | undefined>(
  undefined,
);

type AuthSessionProviderProps = PropsWithChildren<{
  manager?: AuthSessionManager;
}>;

export function AuthSessionProvider({
  children,
  manager,
}: AuthSessionProviderProps) {
  const [defaultManager] = useState(
    () =>
      new AuthSessionManager(
        new MemoryAccessTokenStore(),
        new ExpoSecureRefreshTokenStore(),
      ),
  );
  const activeManager = manager ?? defaultManager;

  useEffect(() => {
    void activeManager.inspectSessionPresence();
  }, [activeManager]);

  return (
    <AuthSessionContext.Provider value={activeManager}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const manager = useContext(AuthSessionContext);
  if (manager === undefined) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }

  return manager;
}

export function useSessionPresence() {
  const manager = useAuthSession();
  return useSyncExternalStore(
    manager.subscribeToSessionPresence,
    manager.getSessionPresence,
    manager.getSessionPresence,
  );
}
