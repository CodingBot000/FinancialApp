import { render } from '@testing-library/react-native';
import { useEffect, type PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-auth-session', () => ({
  CodeChallengeMethod: { S256: 'S256' },
  ResponseType: { Code: 'code' },
  makeRedirectUri: vi.fn(() => 'wealthsandbox://oauth/callback'),
}));
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));
vi.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: vi.fn() }));

import { usePlatformApi } from '../../../shared/api/platform-api-context';
import { MemoryAccessTokenStore } from '../../../shared/auth/access-token-store';
import { AuthSessionProvider } from '../../../shared/auth/auth-session-context';
import { AuthSessionManager } from '../../../shared/auth/auth-session-manager';
import type { BiometricGate } from '../../../shared/auth/biometric-gate';
import {
  PortfolioAccessProvider,
  usePortfolioAccess,
} from '../../../shared/auth/portfolio-access-context';
import type { RefreshTokenStore } from '../../../shared/auth/refresh-token-store';
import {
  ConfiguredPlatformApiProvider,
  createConfiguredPlatformApi,
} from '../model/configured-platform-api-provider';
import { LoginBoundary } from './login-boundary';

class EmptyRefreshTokenStore implements RefreshTokenStore {
  clear() {
    return Promise.resolve();
  }
  read() {
    return Promise.resolve(undefined);
  }
  write() {
    return Promise.resolve();
  }
}

function ApiProbe() {
  const api = usePlatformApi();
  return <Text>{api.constructor.name}</Text>;
}

function UnlockThenShow({ children }: PropsWithChildren) {
  const access = usePortfolioAccess();
  useEffect(() => {
    void access.authenticate();
  }, [access]);
  return access.state.phase === 'unlocked' ? children : null;
}

describe('portfolio login composition', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the Expo public API URL from the bundled environment', () => {
    vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'local');
    vi.stubEnv('EXPO_PUBLIC_LOGIN_MODE', 'test');
    vi.stubEnv('EXPO_PUBLIC_LOCAL_TEST_ACCESS_TOKEN', '<local-test-token>');
    vi.stubEnv('EXPO_PUBLIC_PLATFORM_API_MODE', 'http');
    vi.stubEnv('EXPO_PUBLIC_PLATFORM_API_URL', 'http://10.0.2.2:8081');

    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      new EmptyRefreshTokenStore(),
    );
    const api = createConfiguredPlatformApi(manager);

    expect(api.constructor.name).toBe('HttpPlatformApi');
  });

  it('keeps HTTP API mode when the local portfolio is unlocked', () => {
    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      new EmptyRefreshTokenStore(),
    );
    const api = createConfiguredPlatformApi(manager, {
      EXPO_PUBLIC_APP_ENV: 'local',
      EXPO_PUBLIC_LOGIN_MODE: 'test',
      EXPO_PUBLIC_LOCAL_TEST_ACCESS_TOKEN: '<local-test-token>',
      EXPO_PUBLIC_PLATFORM_API_MODE: 'http',
      EXPO_PUBLIC_PLATFORM_API_URL: 'http://10.0.2.2:8081',
    });

    expect(api.constructor.name).toBe('HttpPlatformApi');
  });

  it('opens the mock-backed home without showing OIDC configuration', async () => {
    const manager = new AuthSessionManager(
      new MemoryAccessTokenStore(),
      new EmptyRefreshTokenStore(),
    );
    await manager.inspectSessionPresence();
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    };
    const view = await render(
      <AuthSessionProvider manager={manager}>
        <PortfolioAccessProvider biometricGate={biometricGate}>
          <UnlockThenShow>
            <LoginBoundary>
              <ConfiguredPlatformApiProvider>
                <ApiProbe />
              </ConfiguredPlatformApiProvider>
            </LoginBoundary>
          </UnlockThenShow>
        </PortfolioAccessProvider>
      </AuthSessionProvider>,
    );

    expect(await view.findByText('ContractMockPlatformApi')).toBeTruthy();
    expect(view.queryByText('로그인을 준비하고 있습니다.')).toBeNull();
    expect(biometricGate.authenticate).toHaveBeenCalledOnce();
  });
});
