import { Circle, matchFont } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
} from 'react-native-reanimated';
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native';

import type { MarketBar, MarketInterval } from '../../../shared/api';
import {
  AppText,
  chartTheme,
  colors,
  radius,
  spacing,
} from '../../../shared/design-system';
import { displayLabel } from '../../../shared/format/display-labels';
import { formatDate, formatWon } from '../../../shared/format/finance-format';
import {
  formatMarketChartXLabel,
  formatMarketChartYLabel,
  marketChartDomain,
  toMarketChartPoints,
} from '../model/market-chart-model';
import { formatMarketVolume, marketTrendTone } from '../model/market-display';

export function StockPriceChart({
  bars,
  interval,
  stockName,
}: {
  readonly bars: readonly MarketBar[];
  readonly interval: MarketInterval;
  readonly stockName: string;
}) {
  const reduceMotion = useReducedMotion();
  const points = useMemo(() => toMarketChartPoints(bars), [bars]);
  const domain = useMemo(() => marketChartDomain(points), [points]);
  const axisFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 12 }),
    [],
  );
  const latest = points.at(-1);
  const { state: pressState, isActive } = useChartPressState({
    x: latest?.timestamp ?? 0,
    y: { close: latest?.close ?? 0 },
  });
  const [selectedTimestamp, setSelectedTimestamp] = useState(latest?.timestamp);

  useEffect(() => setSelectedTimestamp(latest?.timestamp), [latest?.timestamp]);
  useAnimatedReaction(
    () => pressState.x.value.value,
    (value, previous) => {
      if (value !== previous) runOnJS(setSelectedTimestamp)(Number(value));
    },
    [pressState],
  );

  if (points.length < 2 || domain === undefined) {
    return (
      <AppText tone="secondary" variant="body">
        표시할 가격 정보가 없습니다.
      </AppText>
    );
  }

  const selectedPoint =
    points.find((point) => point.timestamp === selectedTimestamp) ?? latest;
  const first = points[0];
  const selectedIndex = selectedPoint
    ? points.findIndex((point) => point.timestamp === selectedPoint.timestamp)
    : -1;
  const previousPoint =
    selectedIndex > 0 ? points[selectedIndex - 1] : undefined;
  const closeTone = selectedPoint
    ? marketTrendTone(
        selectedPoint.close,
        previousPoint?.close,
        selectedPoint.open,
      )
    : 'secondary';
  return (
    <View
      accessibilityLabel={`${stockName} ${displayLabel(interval)} 가격 흐름 차트. ${points.length}개. ${first ? formatDate(new Date(first.timestamp).toISOString()) : '-'}부터 ${latest ? formatDate(new Date(latest.timestamp).toISOString()) : '-'}까지`}
      accessible
      style={styles.container}
    >
      <View style={styles.chart}>
        <CartesianChart
          chartPressState={pressState}
          data={points}
          domain={{ y: [domain.min, domain.max] }}
          domainPadding={{ bottom: 8, left: 8, right: 8, top: 8 }}
          frame={{ lineColor: chartTheme.grid, lineWidth: 1 }}
          padding={{ bottom: 4, left: 6, right: 6, top: 10 }}
          xAxis={{
            font: axisFont,
            formatXLabel: (value) =>
              formatMarketChartXLabel(Number(value), interval),
            labelColor: chartTheme.axis,
            lineColor: chartTheme.grid,
            tickCount: 4,
          }}
          xKey="timestamp"
          yAxis={[
            {
              font: axisFont,
              formatYLabel: (value) => formatMarketChartYLabel(Number(value)),
              labelColor: chartTheme.axis,
              lineColor: chartTheme.grid,
              tickCount: 4,
              yKeys: ['close'],
            },
          ]}
          yKeys={['close']}
        >
          {({ points: chartPoints, chartBounds }) => {
            const selectedChartPoint = chartPoints.close.find(
              (point) => point.xValue === selectedTimestamp,
            );
            return (
              <>
                <Area
                  {...(reduceMotion
                    ? {}
                    : { animate: { duration: 500, type: 'timing' as const } })}
                  color={colors.brand.primary}
                  curveType="linear"
                  opacity={0.14}
                  points={chartPoints.close}
                  y0={chartBounds.bottom}
                />
                <Line
                  {...(reduceMotion
                    ? {}
                    : { animate: { duration: 500, type: 'timing' as const } })}
                  color={colors.brand.primary}
                  curveType="linear"
                  points={chartPoints.close}
                  strokeCap="round"
                  strokeJoin="round"
                  strokeWidth={3}
                />
                {isActive ? (
                  <Circle
                    color={chartTheme.point}
                    cx={pressState.x.position}
                    cy={pressState.y.close.position}
                    r={5}
                  />
                ) : selectedChartPoint &&
                  typeof selectedChartPoint.y === 'number' ? (
                  <Circle
                    color={chartTheme.point}
                    cx={selectedChartPoint.x}
                    cy={selectedChartPoint.y}
                    r={4}
                  />
                ) : null}
              </>
            );
          }}
        </CartesianChart>
      </View>
      {selectedPoint ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.tooltip, isActive && styles.tooltipActive]}
        >
          <AppText tone="secondary" variant="caption">
            {formatDate(new Date(selectedPoint.timestamp).toISOString())}
          </AppText>
          <AppText tone={closeTone} variant="bodyStrong">
            종가 {formatWon(String(selectedPoint.close))}
          </AppText>
          <View style={styles.ohlcList}>
            <AppText tone="secondary" variant="caption">
              시가 {formatWon(String(selectedPoint.open))}
            </AppText>
            <AppText tone="secondary" variant="caption">
              고가 {formatWon(String(selectedPoint.high))}
            </AppText>
            <AppText tone="secondary" variant="caption">
              저가 {formatWon(String(selectedPoint.low))}
            </AppText>
          </View>
          <AppText tone="secondary" variant="caption">
            거래량 {formatMarketVolume(String(selectedPoint.volume))}
          </AppText>
        </View>
      ) : null}
      <View style={styles.captionRow}>
        <AppText tone="secondary" variant="caption">
          {first ? formatDate(new Date(first.timestamp).toISOString()) : '-'}
        </AppText>
        <AppText tone="secondary" variant="caption">
          {latest ? formatDate(new Date(latest.timestamp).toISOString()) : '-'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  chart: { height: 240 },
  container: { marginTop: spacing[1] },
  ohlcList: { gap: spacing[1] },
  tooltip: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.input,
    gap: spacing[1],
    marginTop: spacing[2],
    padding: spacing[3],
  },
  tooltipActive: { backgroundColor: colors.surface.warm },
});
