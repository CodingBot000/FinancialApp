import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { MarketBar } from '../../../shared/api';
import {
  formatCompactWon,
  formatDate,
} from '../../../shared/format/finance-format';
import { toMarketChartPoints } from '../model/market-display';

export function StockPriceChart({
  bars,
  stockName,
}: {
  readonly bars: readonly MarketBar[];
  readonly stockName: string;
}) {
  const reduceMotion = useReducedMotion();
  const points = useMemo(() => toMarketChartPoints(bars), [bars]);
  if (points.length < 2) {
    return <Text style={styles.empty}>표시할 가격 데이터가 없습니다.</Text>;
  }

  const first = bars[0];
  const last = bars[bars.length - 1];
  return (
    <View
      accessibilityLabel={`${stockName} 가격 차트. ${first ? formatDate(first.bucketAt) : ''}부터 ${last ? formatDate(last.bucketAt) : ''}까지`}
      accessible
      style={styles.container}
    >
      <View style={styles.chart}>
        <CartesianChart
          data={points}
          domainPadding={{ bottom: 8, left: 8, right: 8, top: 8 }}
          padding={{ bottom: 8, left: 4, right: 4, top: 8 }}
          xKey="index"
          yKeys={['close']}
        >
          {({ points: chartPoints }) => (
            <Line
              {...(reduceMotion
                ? {}
                : { animate: { duration: 650, type: 'timing' as const } })}
              color="#39e8b5"
              curveType="natural"
              points={chartPoints.close}
              strokeCap="round"
              strokeJoin="round"
              strokeWidth={3}
            />
          )}
        </CartesianChart>
      </View>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>
          {first ? formatDate(first.bucketAt) : '-'}
        </Text>
        <Text style={styles.caption}>
          {last ? formatCompactWon(last.close) : '-'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { color: '#8192a9', fontSize: 11 },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chart: { height: 210, marginTop: 12 },
  container: { marginTop: 12 },
  empty: { color: '#91a1b7', fontSize: 13, marginTop: 16 },
});
