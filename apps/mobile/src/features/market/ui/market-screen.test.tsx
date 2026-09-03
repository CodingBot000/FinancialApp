import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { MarketScreen } from './market-screen';

vi.mock('victory-native', () => ({
  Area: () => null,
  CartesianChart: () => null,
  Line: () => null,
  useChartPressState: () => ({
    isActive: false,
    state: {
      x: { position: { value: 0 }, value: { value: 0 } },
      y: { close: { position: { value: 0 }, value: { value: 0 } } },
    },
  }),
}));

vi.mock('react-native-reanimated', () => ({
  runOnJS: (callback: unknown) => callback,
  useAnimatedReaction: () => undefined,
  useReducedMotion: () => true,
}));

vi.mock('@shopify/react-native-skia', () => ({
  Circle: () => null,
  matchFont: () => null,
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

    await waitFor(() => expect(view.queryByText('검색 결과')).toBeNull());
    expect(view.getByText('005930 · 코스피 · 전자부품 제조업')).toBeTruthy();
    expect(await view.findAllByText('74,200원')).toHaveLength(2);
    expect(view.getByText('전일대비')).toBeTruthy();
    expect(view.getByText('등락률')).toBeTruthy();
    expect(view.getByText('거래량')).toBeTruthy();
    expect(
      await view.findByLabelText(/삼성전자 일봉 가격 흐름 차트/),
    ).toBeTruthy();
    fireEvent.press(view.getByRole('tab', { name: '주봉' }));
    await waitFor(() => expect(view.getByText('주봉 6개')).toBeTruthy());
    expect(view.queryByText('가격 흐름을 확인하지 못했습니다.')).toBeNull();
  });
});
