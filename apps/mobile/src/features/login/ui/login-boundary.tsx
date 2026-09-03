import { useMemo, type PropsWithChildren } from 'react';
import * as WebBrowser from 'expo-web-browser';

import {
  useAuthSession,
  useOptionalPortfolioAccess,
  useSessionPresence,
} from '../../../shared/auth';
import { createOidcSessionComposition } from '../model/create-oidc-session-composition';
import { OidcConfigurationScreen, OidcLoginScreen } from './oidc-login-screen';

WebBrowser.maybeCompleteAuthSession();

export function LoginBoundary({ children }: PropsWithChildren) {
  const manager = useAuthSession();
  const portfolioAccess = useOptionalPortfolioAccess();
  const sessionPresence = useSessionPresence();
  const composition = useMemo(
    () => createOidcSessionComposition(manager),
    [manager],
  );

  if (
    portfolioAccess?.state.phase === 'unlocked' ||
    sessionPresence !== 'absent'
  ) {
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
