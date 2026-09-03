import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { MarketDetailScreen } from './market-detail-screen';

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

describe('MarketDetailScreen', () => {
  it('loads a symbol route and supports back navigation', async () => {
    const onBack = vi.fn();
    const queryClient = createMobileQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    const view = await render(
      <PlatformApiProvider api={new ContractMockPlatformApi({ latencyMs: 0 })}>
        <QueryClientProvider client={queryClient}>
          <MarketDetailScreen onBack={onBack} symbol="005930" />
        </QueryClientProvider>
      </PlatformApiProvider>,
    );

    expect(await view.findByText('삼성전자')).toBeTruthy();
    expect(
      await view.findByText('005930 · 코스피 · 전자부품 제조업'),
    ).toBeTruthy();
    expect(await view.findAllByText('74,200원')).toHaveLength(2);
    expect(
      await view.findByLabelText(/삼성전자 일봉 가격 흐름 차트/),
    ).toBeTruthy();
    fireEvent.press(view.getByLabelText('뒤로 가기'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly empty state for an unknown symbol', async () => {
    const queryClient = createMobileQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    const view = await render(
      <PlatformApiProvider api={new ContractMockPlatformApi({ latencyMs: 0 })}>
        <QueryClientProvider client={queryClient}>
          <MarketDetailScreen symbol="000000" />
        </QueryClientProvider>
      </PlatformApiProvider>,
    );

    expect(await view.findByText('종목을 찾을 수 없습니다.')).toBeTruthy();
  });
});
