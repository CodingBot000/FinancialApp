import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { SimulationPoint } from '../../../shared/api';
import {
  AppText,
  colors,
  MoneyValue,
  spacing,
} from '../../../shared/design-system';
import { useMoneyVisibilityStore } from '../../../shared/privacy';

const PERCENTILE_LABELS = {
  p10: '낮은 범위',
  p50: '중앙값',
  p90: '높은 범위',
} as const;

function samples(series: readonly SimulationPoint[]) {
  if (series.length <= 6) return series;
  return Array.from(
    { length: 6 },
    (_, index) => series[Math.round((index * (series.length - 1)) / 5)],
  ).filter((point): point is SimulationPoint => point !== undefined);
}

export function PercentileChart({
  series,
}: {
  readonly series: readonly SimulationPoint[];
}) {
  const reduceMotion = useReducedMotion();
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const points = useMemo(() => samples(series), [series]);
  const [selected, setSelected] = useState(points.at(-1));
  const maximum = Math.max(...points.map((point) => Number(point.p90)), 1);
  return (
    <View
      accessibilityLabel={`예상 자산 범위 차트. 모션 ${reduceMotion ? '감소' : '기본'}`}
      accessible
      style={styles.chart}
    >
      <AppText variant="heading">예상 자산 범위</AppText>
      <View style={styles.columns}>
        {points.map((point) => (
          <Pressable
            accessibilityLabel={`${point.month}개월 결과 보기`}
            accessibilityRole="button"
            key={point.month}
            onPress={() => setSelected(point)}
            style={styles.column}
          >
            <View style={styles.bars}>
              <View
                style={[
                  styles.band,
                  { height: Math.max(12, (Number(point.p90) / maximum) * 100) },
                ]}
              />
              <View
                style={[
                  styles.median,
                  { height: Math.max(8, (Number(point.p50) / maximum) * 100) },
                ]}
              />
            </View>
            <AppText style={styles.month} tone="secondary" variant="caption">
              {point.month}개월
            </AppText>
          </Pressable>
        ))}
      </View>
      {selected ? (
        <View accessibilityLiveRegion="polite" style={styles.tooltip}>
          <AppText tone="secondary" variant="caption">
            {selected.month}개월 기준
          </AppText>
          <AppText variant="caption">
            {PERCENTILE_LABELS.p10}{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={selected.p10}
            />{' '}
            · {PERCENTILE_LABELS.p50}{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={selected.p50}
            />{' '}
            · {PERCENTILE_LABELS.p90}{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={selected.p90}
            />
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.market.downSoft, borderRadius: 4, width: 14 },
  bars: { alignItems: 'center', height: 108, justifyContent: 'flex-end' },
  chart: { marginTop: spacing[5] },
  column: { flex: 1, minHeight: 140 },
  columns: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  median: {
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
    bottom: 0,
    position: 'absolute',
    width: 8,
  },
  month: { marginTop: spacing[2], textAlign: 'center' },
  tooltip: { gap: spacing[1], marginTop: spacing[3] },
});
