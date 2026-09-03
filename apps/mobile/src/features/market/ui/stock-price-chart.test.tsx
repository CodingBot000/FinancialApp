import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { colors } from '../../../shared/design-system';
import { StockPriceChart } from './stock-price-chart';

const { areaSpy, chartSpy, lineSpy } = vi.hoisted(() => ({
  areaSpy: vi.fn(),
  chartSpy: vi.fn(),
  lineSpy: vi.fn(),
}));

vi.mock('victory-native', () => ({
  Area: (props: unknown) => {
    areaSpy(props);
    return null;
  },
  CartesianChart: (props: {
    children: (value: {
      chartBounds: { bottom: number; left: number; right: number; top: number };
      points: { close: readonly unknown[] };
    }) => ReactNode;
  }) => {
    chartSpy(props);
    return props.children({
      chartBounds: { bottom: 200, left: 20, right: 300, top: 10 },
      points: { close: [] },
    });
  },
  Line: (props: unknown) => {
    lineSpy(props);
    return null;
  },
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

describe('StockPriceChart', () => {
  it('uses timestamp axes, bottom area baseline, and monotone price paths', async () => {
    const view = await render(
      <StockPriceChart
        bars={[
          {
            bucketAt: '2026-09-01T00:00:00.000Z',
            open: '73000.0000',
            high: '74000.0000',
            low: '72000.0000',
            close: '73500.0000',
            volume: '1000',
          },
          {
            bucketAt: '2026-09-02T00:00:00.000Z',
            open: '74000.0000',
            high: '75000.0000',
            low: '73000.0000',
            close: '74200.0000',
            volume: '2000',
          },
        ]}
        interval="DAILY"
        stockName="삼성전자"
      />,
    );

    expect(chartSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        xKey: 'timestamp',
        xAxis: expect.objectContaining({ tickCount: 4 }),
        yAxis: [expect.objectContaining({ tickCount: 4, yKeys: ['close'] })],
      }),
    );
    expect(areaSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        curveType: 'monotoneX',
        opacity: 0.14,
        y0: 200,
      }),
    );
    expect(lineSpy).toHaveBeenCalledWith(
      expect.objectContaining({ curveType: 'monotoneX' }),
    );
    expect(view.getByText('종가 74,200원')).toBeTruthy();
    expect(view.getByText('시가 74,000원')).toBeTruthy();
    expect(view.getByText('고가 75,000원')).toBeTruthy();
    expect(view.getByText('저가 73,000원')).toBeTruthy();
    expect(view.getByText('종가 74,200원').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: colors.market.up }),
      ]),
    );
    expect(view.getByText('거래량 2,000')).toBeTruthy();
    expect(view.getByLabelText(/삼성전자 일봉 가격 흐름 차트/)).toBeTruthy();
  });
});
