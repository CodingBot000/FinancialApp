import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native-reanimated', () => ({
  useReducedMotion: () => true,
}));
vi.mock('victory-native', () => ({
  Area: () => null,
  CartesianChart: () => null,
  Line: () => null,
}));

import { PlatformApiError, PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { WealthDashboardScreen } from './wealth-dashboard-screen';

async function renderScreen(api: ContractMockPlatformApi) {
  const queryClient = createMobileQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <WealthDashboardScreen />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  return { queryClient, view };
}

describe('WealthDashboardScreen', () => {
  it('renders the server summary, masked accounts, details, charts, and sync', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const accountDetail = vi.spyOn(api, 'getAccount');
    const { queryClient, view } = await renderScreen(api);

    expect(await view.findAllByText('185,400,000원')).toHaveLength(2);
    expect(view.getByText(/내 자산을 한눈에/)).toBeTruthy();
    expect(view.getByText('자산 추이')).toBeTruthy();
    expect(view.getByText('자산 배분')).toBeTruthy();
    expect(view.getByLabelText(/모션 감소/)).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: /0001/ }));
    expect(await view.findByText(/계좌 상세 · \*\*\*-\*\*-0001/)).toBeTruthy();
    expect(accountDetail).toHaveBeenCalledOnce();
    expect(view.getByText('Synthetic Equity Fund')).toBeTruthy();
    expect(view.getByText(/1,360 · 주식/)).toBeTruthy();

    const invalidation = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.press(view.getByRole('button', { name: '지금 업데이트' }));
    expect(await view.findByText(/완료 · 계좌/)).toBeTruthy();
    await waitFor(() => expect(invalidation).toHaveBeenCalledTimes(7));
    expect(invalidation).toHaveBeenCalledWith({
      exact: true,
      queryKey: ['wealth', 'summary'],
    });
  });

  it('keeps usable data visible when one dashboard query fails', async () => {
    class FailedApi extends ContractMockPlatformApi {
      override getAssetSummary() {
        return Promise.reject(
          new PlatformApiError({
            kind: 'network',
            message: '테스트 API 연결 실패',
            retryable: true,
          }),
        );
      }
    }
    const { view } = await renderScreen(new FailedApi({ latencyMs: 20 }));

    expect(
      await view.findByText('일부 정보를 갱신하지 못했습니다.'),
    ).toBeTruthy();
    expect(view.getByText('확인된 정보는 계속 표시합니다.')).toBeTruthy();
    expect(view.getByRole('button', { name: '다시 확인' })).toBeTruthy();
  });
});
