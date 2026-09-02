import { useMemo, type PropsWithChildren } from 'react';
import * as WebBrowser from 'expo-web-browser';

import { useAuthSession, useSessionPresence } from '../../../shared/auth';
import { createOidcSessionComposition } from '../model/create-oidc-session-composition';
import { OidcConfigurationScreen, OidcLoginScreen } from './oidc-login-screen';

WebBrowser.maybeCompleteAuthSession();

export function LoginBoundary({ children }: PropsWithChildren) {
  const manager = useAuthSession();
  const sessionPresence = useSessionPresence();
  const composition = useMemo(
    () => createOidcSessionComposition(manager),
    [manager],
  );

  if (sessionPresence !== 'absent') {
    return children;
  }

  if (composition.status === 'unavailable') {
    return (
      <OidcConfigurationScreen
        invalid={composition.invalid}
        missing={composition.missing}
      />
    );
  }

  return (
    <OidcLoginScreen
      login={() => composition.login.login()}
      loginMode={composition.loginMode}
    />
  );
}
