import type {
  AuthSessionManager,
  RefreshCoordinator,
} from '../../../shared/auth';
import { ExpoOidcClient } from '../../../shared/auth/expo-oidc-client';
import { readOidcPublicConfig } from '../../../shared/config';
import { OidcLoginService } from './oidc-login-service';

type PublicEnvironment = Readonly<Record<string, string | undefined>>;

export type OidcSessionComposition =
  | Readonly<{
      invalid: readonly ('clientId' | 'issuer')[];
      missing: readonly ('clientId' | 'issuer')[];
      status: 'unavailable';
    }>
  | Readonly<{
      login: OidcLoginService;
      refreshCoordinator: RefreshCoordinator;
      status: 'configured';
    }>;

export function createOidcSessionComposition(
  manager: AuthSessionManager,
  environment: PublicEnvironment = process.env,
): OidcSessionComposition {
  const configState = readOidcPublicConfig(environment);
  if (configState.status === 'unavailable') {
    return configState;
  }

  const client = new ExpoOidcClient(configState.config);
  return {
    login: new OidcLoginService(client, manager),
    refreshCoordinator: manager.createRefreshCoordinator(client),
    status: 'configured',
  };
}
