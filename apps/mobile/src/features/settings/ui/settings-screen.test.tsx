import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import { PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { MemoryAccessTokenStore } from '../../../shared/auth/access-token-store';
import { AuthSessionProvider } from '../../../shared/auth/auth-session-context';
import { AuthSessionManager } from '../../../shared/auth/auth-session-manager';
import type { RefreshTokenStore } from '../../../shared/auth/refresh-token-store';
import { useMoneyVisibilityStore } from '../../../shared/privacy';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { SettingsScreen } from './settings-screen';

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

async function renderSettings(api: ContractMockPlatformApi) {
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
          <SettingsScreen />
        </QueryClientProvider>
      </PlatformApiProvider>
    </AuthSessionProvider>,
  );
  return { manager, view };
}

describe('SettingsScreen', () => {
  beforeEach(() => useMoneyVisibilityStore.setState({ hidden: false }));

  it('shows account, privacy controls and no developer surface', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const updateSpy = vi.spyOn(api, 'updateRiskProfile');
    const { manager, view } = await renderSettings(api);
    expect(await view.findByText('테스트 사용자 A')).toBeTruthy();
    expect((await view.findByLabelText('월 납입액')).props.value).toBe(
      '1500000',
    );
    expect(view.getByText('내 정보')).toBeTruthy();
    expect(view.queryByText('개발자 도구')).toBeNull();
    expect(view.queryByText('시나리오 TIMEOUT')).toBeNull();
    fireEvent.press(view.getByRole('switch', { name: '금액 숨기기' }));
    expect(useMoneyVisibilityStore.getState().hidden).toBe(true);
    expect(view.getByText('투자 성향 정보')).toBeTruthy();
    expect(view.getByText(/투자 추천이 아닙니다/)).toBeTruthy();
    await view.findByRole('button', { name: '성장형' });
    fireEvent.press(view.getByRole('button', { name: '성장형' }));
    fireEvent.changeText(view.getByLabelText('투자 기간 개월'), '180');
    fireEvent.changeText(view.getByLabelText('월 납입액'), '2000000');
    fireEvent.press(view.getByRole('button', { name: '투자 성향 저장' }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledOnce());
    expect(
      await view.findByText('투자 성향 정보가 저장되었습니다.'),
    ).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: '현재 세션 로그아웃' }));
    await waitFor(() => expect(manager.getSessionPresence()).toBe('absent'));
  });
});
