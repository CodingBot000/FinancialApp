import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { MarketScreen } from './market-screen';

vi.mock('victory-native', () => ({
  CartesianChart: () => null,
  Line: () => null,
}));

vi.mock('react-native-reanimated', () => ({
  useReducedMotion: () => true,
}));

describe('MarketScreen', () => {
  it('searches, selects a stock, and renders quote/chart data', async () => {
    const queryClient = createMobileQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    const view = await render(
      <PlatformApiProvider api={new ContractMockPlatformApi({ latencyMs: 0 })}>
        <QueryClientProvider client={queryClient}>
          <MarketScreen />
        </QueryClientProvider>
      </PlatformApiProvider>,
    );

    fireEvent.changeText(
      view.getByLabelText('종목명 또는 종목코드 검색'),
      '삼성',
    );
    expect(await view.findByText('삼성전자')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: /삼성전자/ }));

    expect(await view.findByText('74,200원')).toBeTruthy();
    expect(await view.findByLabelText(/삼성전자 가격 흐름 차트/)).toBeTruthy();
    fireEvent.press(view.getByRole('tab', { name: '주봉' }));
    await waitFor(() =>
      expect(view.getByRole('tab', { name: '주봉' })).toBeTruthy(),
    );
  });
});
