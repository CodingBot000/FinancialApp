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

async function renderSettings(
  api: ContractMockPlatformApi,
  developerToolsEnabled: boolean,
) {
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
          <SettingsScreen developerToolsEnabled={developerToolsEnabled} />
        </QueryClientProvider>
      </PlatformApiProvider>
    </AuthSessionProvider>,
  );
  return { manager, view };
}

describe('SettingsScreen', () => {
  beforeEach(() => useMoneyVisibilityStore.setState({ hidden: false }));

  it('fails closed in production while providing privacy and logout controls', async () => {
    const { manager, view } = await renderSettings(
      new ContractMockPlatformApi({ latencyMs: 0 }),
      false,
    );
    expect(await view.findByText('데이터셋 기본 데이터셋 1')).toBeTruthy();
    expect(
      view.getByText('테스트 데이터 · 실제 개인정보·계좌정보 없음'),
    ).toBeTruthy();
    expect(view.queryByText('개발자 도구')).toBeNull();
    expect(view.queryByText('시나리오 TIMEOUT')).toBeNull();

    fireEvent.press(view.getByRole('switch', { name: '금액 숨기기' }));
    expect(useMoneyVisibilityStore.getState().hidden).toBe(true);
    await waitFor(() => expect(view.getByText('켜짐')).toBeTruthy());

    fireEvent.press(view.getByRole('button', { name: '현재 세션 로그아웃' }));
    await waitFor(() => expect(manager.getSessionPresence()).toBe('absent'));
  });

  it('reproduces scenarios and reset only when explicitly enabled', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const scenarioSpy = vi.spyOn(api, 'setDeveloperScenario');
    const resetSpy = vi.spyOn(api, 'resetDeveloperDataset');
    const { view } = await renderSettings(api, true);
    expect(await view.findByText('개발자 도구')).toBeTruthy();

    fireEvent.press(
      view.getByRole('button', { name: '시나리오 주문 거절' }),
    );
    await waitFor(() =>
      expect(scenarioSpy).toHaveBeenCalledWith('ORDER_REJECT'),
    );
    expect(await view.findByText('시나리오 주문 거절 적용')).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: '테스트 데이터 초기화' }));
    await waitFor(() => expect(resetSpy).toHaveBeenCalledOnce());
    expect(
      await view.findByText('테스트 데이터 기본 데이터셋 1 초기화'),
    ).toBeTruthy();
  });

  it('edits the owner risk profile without presenting a recommendation', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const updateSpy = vi.spyOn(api, 'updateRiskProfile');
    const { view } = await renderSettings(api, false);

    expect(await view.findByText('투자 성향 정보')).toBeTruthy();
    expect(view.getByText(/투자 추천이 아닙니다/)).toBeTruthy();
    await waitFor(() =>
      expect(view.getByRole('button', { name: '성장형' })).toBeTruthy(),
    );
    fireEvent.press(view.getByRole('button', { name: '성장형' }));
    fireEvent.changeText(view.getByLabelText('투자 기간 개월'), '180');
    fireEvent.changeText(view.getByLabelText('월 납입액'), '2000000.0000');
    await waitFor(() => {
      expect(
        view.getByRole('button', { name: '성장형' }).props.accessibilityState,
      ).toEqual({ selected: true });
      expect(view.getByLabelText('투자 기간 개월').props.value).toBe('180');
      expect(view.getByLabelText('월 납입액').props.value).toBe('2000000.0000');
    });
    fireEvent.press(view.getByRole('button', { name: '투자 성향 저장' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({
        riskLevel: 'GROWTH',
        investmentHorizonMonths: 180,
        monthlyContribution: '2000000.0000',
        expectedVersion: '0',
      }),
    );
    expect(
      await view.findByText('투자 성향 정보가 저장되었습니다.'),
    ).toBeTruthy();
  });
});
