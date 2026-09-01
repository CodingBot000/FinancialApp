import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { SimulationPoint } from '../../../shared/api';
import { formatCompactWon } from '../../../shared/format/finance-format';
import { useMoneyVisibilityStore } from '../../../shared/privacy';

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
      accessibilityLabel={`p10 p50 p90 백분위 차트. 모션 ${reduceMotion ? '감소' : '기본'}`}
      accessible
      style={styles.chart}
    >
      <Text style={styles.heading}>기간별 예상 자산 범위</Text>
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
              {(['p10', 'p50', 'p90'] as const).map((percentile) => (
                <View
                  key={percentile}
                  style={[
                    styles.bar,
                    styles[percentile],
                    {
                      height: Math.max(
                        6,
                        (Number(point[percentile]) / maximum) * 100,
                      ),
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.month}>{point.month}개월</Text>
          </Pressable>
        ))}
      </View>
      {selected ? (
        <Text accessibilityLiveRegion="polite" style={styles.tooltip}>
          {selected.month}개월 · p10{' '}
          {formatCompactWon(selected.p10, amountsHidden)} · p50{' '}
          {formatCompactWon(selected.p50, amountsHidden)} · p90{' '}
          {formatCompactWon(selected.p90, amountsHidden)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderRadius: 3, flex: 1, minWidth: 4 },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    height: 108,
  },
  chart: { marginTop: 20 },
  column: { flex: 1, minHeight: 140 },
  columns: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  heading: { color: '#d9e3ef', fontSize: 14, fontWeight: '800' },
  month: { color: '#8192a9', fontSize: 9, marginTop: 6, textAlign: 'center' },
  p10: { backgroundColor: '#62738d' },
  p50: { backgroundColor: '#39e8b5' },
  p90: { backgroundColor: '#8d7cf6' },
  tooltip: { color: '#d9e3ef', fontSize: 11, lineHeight: 18, marginTop: 10 },
});
