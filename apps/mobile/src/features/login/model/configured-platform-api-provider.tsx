import { useMemo, type PropsWithChildren } from 'react';

import { AuthenticatedFetch } from '../../../shared/api/authenticated-fetch';
import { HttpPlatformApi } from '../../../shared/api/http-platform-api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import type { PlatformApi } from '../../../shared/api/platform-api';
import { PlatformApiProvider } from '../../../shared/api/platform-api-context';
import { UnavailablePlatformApi } from '../../../shared/api/unavailable-platform-api';
import type { AuthSessionManager } from '../../../shared/auth/auth-session-manager';
import { useAuthSession } from '../../../shared/auth/auth-session-context';
import { ExpoOidcClient } from '../../../shared/auth/expo-oidc-client';
import { LocalTestOidcClient } from '../../../shared/auth/local-test-oidc-client';
import {
  isLocalTestLoginEnabled,
  readOidcPublicConfig,
} from '../../../shared/config';

type PublicEnvironment = Readonly<Record<string, string | undefined>>;

export function createConfiguredPlatformApi(
  manager: AuthSessionManager,
  environment: PublicEnvironment = process.env,
): PlatformApi {
  const apiMode =
    environment.EXPO_PUBLIC_PLATFORM_API_MODE ?? (__DEV__ ? 'mock' : 'http');

  if (apiMode === 'mock') return new ContractMockPlatformApi();

  const baseUrl = environment.EXPO_PUBLIC_PLATFORM_API_URL?.trim();
  if (!baseUrl) {
    return new UnavailablePlatformApi(
      'HTTP API mode에는 EXPO_PUBLIC_PLATFORM_API_URL이 필요합니다.',
    );
  }
  if (isLocalTestLoginEnabled(environment)) {
    const client = new LocalTestOidcClient();
    const authenticatedFetch = new AuthenticatedFetch(
      manager,
      manager.createRefreshCoordinator(client),
    );
    return new HttpPlatformApi({
      authenticatedFetch: (input, init) =>
        authenticatedFetch.request(input, init),
      baseUrl,
    });
  }

  const oidc = readOidcPublicConfig(environment);
  if (oidc.status === 'unavailable') {
    return new UnavailablePlatformApi(
      '인증 API를 사용하려면 공개 인증 서버 주소와 클라이언트 ID가 필요합니다.',
    );
  }

  const client = new ExpoOidcClient(oidc.config);
  const authenticatedFetch = new AuthenticatedFetch(
    manager,
    manager.createRefreshCoordinator(client),
  );
  return new HttpPlatformApi({
    authenticatedFetch: (input, init) =>
      authenticatedFetch.request(input, init),
    baseUrl,
  });
}

export function ConfiguredPlatformApiProvider({ children }: PropsWithChildren) {
  const manager = useAuthSession();
  const api = useMemo(() => createConfiguredPlatformApi(manager), [manager]);
  return <PlatformApiProvider api={api}>{children}</PlatformApiProvider>;
}
