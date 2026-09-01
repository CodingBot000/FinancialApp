import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { Allocation, AssetHistoryPoint } from '../../../shared/api';
import { formatCompactWon } from '../model/wealth-format';

export function AssetCharts({
  allocation,
  history,
}: {
  readonly allocation: readonly Allocation[];
  readonly history: readonly AssetHistoryPoint[];
}) {
  const reduceMotion = useReducedMotion();
  const maximum = Math.max(
    ...history.map((point) => Number(point.totalAssets)),
    1,
  );
  return (
    <View
      accessibilityLabel={`자산 추이와 배분 차트. 모션 ${reduceMotion ? '감소' : '기본'}`}
      accessible
    >
      <Text style={styles.heading}>자산 추이</Text>
      <View style={styles.trend}>
        {history.map((point) => (
          <View
            accessibilityLabel={`${point.date} ${formatCompactWon(point.totalAssets)}`}
            key={point.date}
            style={[
              styles.trendBar,
              {
                height: Math.max(8, (Number(point.totalAssets) / maximum) * 92),
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.heading}>자산 배분</Text>
      {allocation.map((item) => (
        <View key={item.assetClass} style={styles.allocationRow}>
          <Text style={styles.label}>{item.assetClass}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(2, item.weight * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.value}>{Math.round(item.weight * 100)}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  allocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  fill: { backgroundColor: '#39e8b5', borderRadius: 4, height: 8 },
  heading: { color: '#cbd7e8', fontSize: 13, fontWeight: '700', marginTop: 18 },
  label: { color: '#8fa0b7', fontSize: 11, width: 58 },
  track: { backgroundColor: '#22334a', borderRadius: 4, flex: 1, height: 8 },
  trend: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    height: 100,
    marginTop: 10,
  },
  trendBar: {
    backgroundColor: '#39e8b5',
    borderRadius: 5,
    flex: 1,
    minWidth: 8,
  },
  value: { color: '#cbd7e8', fontSize: 11, textAlign: 'right', width: 36 },
});
