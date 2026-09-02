import { StyleSheet, Text, View } from 'react-native';

import { chartSmokeData } from '../model/chart-smoke-data';
import { colors } from '../../../shared/design-system';

export function ChartSmoke() {
  return (
    <View
      accessibilityLabel="자산 추이 차트. 100에서 151로 변화"
      accessible
      style={styles.chart}
    >
      <View style={styles.bars}>
        {chartSmokeData.map((point) => (
          <View
            key={point.month}
            style={[
              styles.bar,
              { height: `${Math.round(point.assets / 1.7)}%` },
            ]}
          />
        ))}
      </View>
      <Text style={styles.caption}>100 → 151 · 예시 추이</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
    flex: 1,
    minHeight: 12,
    opacity: 0.85,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 7,
    height: 110,
  },
  caption: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 10,
  },
  chart: {
    height: 148,
    marginTop: 18,
    width: '100%',
  },
});
