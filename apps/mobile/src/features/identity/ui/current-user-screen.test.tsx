import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import { PlatformApiError, PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { MemoryAccessTokenStore } from '../../../shared/auth/access-token-store';
import { AuthSessionProvider } from '../../../shared/auth/auth-session-context';
import { AuthSessionManager } from '../../../shared/auth/auth-session-manager';
import type { RefreshTokenStore } from '../../../shared/auth/refresh-token-store';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { CurrentUserScreen } from './current-user-screen';

class MemoryRefreshTokenStore implements RefreshTokenStore {
  private token: string | undefined;
  clear() {
    this.token = undefined;
    return Promise.resolve();
  }
  read() {
    return Promise.resolve(this.token);
  }
  write(token: string) {
    this.token = token;
    return Promise.resolve();
  }
}

async function renderScreen(api: ContractMockPlatformApi) {
  const manager = new AuthSessionManager(
    new MemoryAccessTokenStore(),
    new MemoryRefreshTokenStore(),
  );
  await manager.establish({
    accessToken: '<synthetic-access-token>',
    refreshToken: '<synthetic-refresh-token>',
  });
  const queryClient = createMobileQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const view = await render(
    <AuthSessionProvider manager={manager}>
      <PlatformApiProvider api={api}>
        <QueryClientProvider client={queryClient}>
          <CurrentUserScreen />
        </QueryClientProvider>
      </PlatformApiProvider>
    </AuthSessionProvider>,
  );
  return { manager, view };
}

describe('CurrentUserScreen', () => {
  it('renders the contract current user and clears the local session', async () => {
    const { manager, view } = await renderScreen(
      new ContractMockPlatformApi({ latencyMs: 0 }),
    );

    expect(await view.findByText('테스트 사용자 A')).toBeTruthy();
    expect(view.getByText('균형형')).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: '로컬 세션 로그아웃' }));
    await waitFor(() => expect(manager.getSessionPresence()).toBe('absent'));
    expect(manager.getAccessToken()).toBeUndefined();
  });

  it('does not offer automatic retry for a missing scope', async () => {
    class DeniedApi extends ContractMockPlatformApi {
      override getCurrentUser() {
        return Promise.reject(
          new PlatformApiError({
            kind: 'http',
            message: 'financial.read scope가 필요합니다.',
            retryable: false,
            status: 403,
          }),
        );
      }
    }
    const { view } = await renderScreen(new DeniedApi({ latencyMs: 0 }));

    expect(
      await view.findByText('내 정보를 확인하지 못했습니다.'),
    ).toBeTruthy();
    expect(
      view.queryByRole('button', { name: '현재 사용자 다시 확인' }),
    ).toBeNull();
  });
});
