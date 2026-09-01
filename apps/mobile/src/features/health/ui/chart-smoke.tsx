import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { CartesianChart, Line } from 'victory-native';

import { chartSmokeData } from '../model/chart-smoke-data';

export function ChartSmoke() {
  const reduceMotion = useReducedMotion();

  return (
    <View
      accessibilityLabel="결정적 합성 자산 추이 차트. 100에서 151로 변화"
      accessible
      style={styles.chart}
    >
      <CartesianChart
        data={[...chartSmokeData]}
        domainPadding={{ bottom: 8, left: 8, right: 8, top: 8 }}
        padding={{ bottom: 8, left: 4, right: 4, top: 8 }}
        xKey="month"
        yKeys={['assets']}
      >
        {({ points }) => (
          <Line
            {...(reduceMotion
              ? {}
              : { animate: { duration: 650, type: 'timing' as const } })}
            color="#39e8b5"
            curveType="natural"
            points={points.assets}
            strokeCap="round"
            strokeJoin="round"
            strokeWidth={3}
          />
        )}
      </CartesianChart>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 148,
    marginTop: 18,
    width: '100%',
  },
});
