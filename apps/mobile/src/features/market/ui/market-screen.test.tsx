import { QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  afterEach(cleanup);

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

    const input = view.getByLabelText('종목명 또는 종목코드 검색');
    fireEvent.changeText(input, '삼성');
    expect(await view.findByText('삼성전자')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: /삼성전자/ }));

    await waitFor(() => expect(view.queryByText('검색 결과')).toBeNull());
    expect(view.getByText('005930 · 코스피 · 전자부품 제조업')).toBeTruthy();
    expect(await view.findAllByText('74,200원')).toHaveLength(1);
    expect(view.getByText('종가 74,200원')).toBeTruthy();
    expect(view.getByText('전일대비')).toBeTruthy();
    expect(view.getByText('등락률')).toBeTruthy();
    expect(view.getByText('거래량')).toBeTruthy();
    expect(view.queryByText(/일봉 \d+개/)).toBeNull();
    expect(view.queryByText('최근 봉 정보')).toBeNull();
    expect(
      await view.findByLabelText(/삼성전자 일봉 가격 흐름 차트/),
    ).toBeTruthy();
    fireEvent.press(view.getByRole('tab', { name: '주봉' }));
    expect(
      await view.findByLabelText(/삼성전자 주봉 가격 흐름 차트/),
    ).toBeTruthy();
    expect(view.queryByText(/주봉 \d+개/)).toBeNull();
    expect(view.queryByText('가격 흐름을 확인하지 못했습니다.')).toBeNull();

    fireEvent.changeText(
      view.getByLabelText('종목명 또는 종목코드 검색'),
      '하이닉스',
    );
    fireEvent.press(
      await view.findByRole('button', { name: /SK하이닉스/ }),
    );
    expect(
      await view.findByText('000660 · 코스피 · 반도체 제조업'),
    ).toBeTruthy();
    expect(view.queryByText('삼성전자')).toBeNull();
  });

  it('runs the search from the separate search button', async () => {
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
    fireEvent.press(view.getByRole('button', { name: '검색 실행' }));

    expect(await view.findByText('삼성전자')).toBeTruthy();
  });
});
