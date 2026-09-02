import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Area, CartesianChart, Line } from 'victory-native';

import type { MarketBar } from '../../../shared/api';
import { AppText, colors, spacing } from '../../../shared/design-system';
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
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(points.length - 1, 0),
  );
  if (points.length < 2) {
    return (
      <AppText tone="secondary" variant="body">
        표시할 가격 정보가 없습니다.
      </AppText>
    );
  }
  const first = bars[0];
  const last = bars[bars.length - 1];
  const selectedPoint = points[selectedIndex] ?? points.at(-1);
  return (
    <View
      accessibilityLabel={`${stockName} 가격 흐름 차트`}
      accessible
      style={styles.container}
    >
      <Pressable
        accessibilityLabel="가격 차트 지점 선택"
        accessibilityRole="button"
        onPress={() =>
          setSelectedIndex((index) => (index === 0 ? points.length - 1 : 0))
        }
        style={styles.chart}
      >
        <CartesianChart
          data={points}
          domainPadding={{ bottom: 8, left: 8, right: 8, top: 8 }}
          padding={{ bottom: 8, left: 4, right: 4, top: 8 }}
          xKey="index"
          yKeys={['close']}
        >
          {({ points: chartPoints }) => (
            <>
              <Area
                {...(reduceMotion
                  ? {}
                  : { animate: { duration: 500, type: 'timing' as const } })}
                color={colors.market.downSoft}
                curveType="natural"
                points={chartPoints.close}
                y0={0}
              />
              <Line
                {...(reduceMotion
                  ? {}
                  : { animate: { duration: 500, type: 'timing' as const } })}
                color={colors.brand.primary}
                curveType="natural"
                points={chartPoints.close}
                strokeCap="round"
                strokeJoin="round"
                strokeWidth={3}
              />
            </>
          )}
        </CartesianChart>
      </Pressable>
      {selectedPoint ? (
        <AppText
          accessibilityLiveRegion="polite"
          tone="secondary"
          variant="caption"
        >
          선택한 날 {formatCompactWon(String(selectedPoint.close))}
        </AppText>
      ) : null}
      <View style={styles.captionRow}>
        <AppText tone="secondary" variant="caption">
          {first ? formatDate(first.bucketAt) : '-'}
        </AppText>
        <AppText variant="bodyStrong">
          {last ? formatCompactWon(last.close) : '-'}
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
  chart: { height: 210, marginTop: spacing[3] },
  container: { marginTop: spacing[3] },
});
