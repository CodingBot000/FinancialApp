import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Area, CartesianChart, Line } from 'victory-native';

import type { Allocation, AssetHistoryPoint } from '../../../shared/api';
import {
  AppText,
  colors,
  MoneyValue,
  radius,
  spacing,
} from '../../../shared/design-system';
import { displayLabel } from '../../../shared/format/display-labels';
import { useMoneyVisibilityStore } from '../../../shared/privacy';

export function AssetCharts({
  allocation,
  history,
}: {
  readonly allocation: readonly Allocation[];
  readonly history: readonly AssetHistoryPoint[];
}) {
  const reduceMotion = useReducedMotion();
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const points = useMemo(
    () =>
      history.map((point, index) => ({
        index,
        total: Number(point.totalAssets),
      })),
    [history],
  );
  return (
    <View
      accessibilityLabel={`자산 추이와 배분 차트. 모션 ${reduceMotion ? '감소' : '기본'}`}
      accessible
      style={styles.container}
    >
      <AppText variant="heading">자산 추이</AppText>
      {points.length > 1 ? (
        <View style={styles.trend}>
          <CartesianChart
            data={points}
            domainPadding={{ bottom: 8, left: 8, right: 8, top: 8 }}
            padding={{ bottom: 8, left: 4, right: 4, top: 8 }}
            xKey="index"
            yKeys={['total']}
          >
            {({ points: chartPoints }) => (
              <>
                <Area
                  {...(reduceMotion
                    ? {}
                    : { animate: { duration: 500, type: 'timing' as const } })}
                  color={colors.market.downSoft}
                  curveType="natural"
                  points={chartPoints.total}
                  y0={0}
                />
                <Line
                  {...(reduceMotion
                    ? {}
                    : { animate: { duration: 500, type: 'timing' as const } })}
                  color={colors.brand.primary}
                  curveType="natural"
                  points={chartPoints.total}
                  strokeCap="round"
                  strokeJoin="round"
                  strokeWidth={3}
                />
              </>
            )}
          </CartesianChart>
        </View>
      ) : (
        <AppText tone="secondary" variant="caption">
          추이를 표시하려면 정보가 더 필요합니다.
        </AppText>
      )}
      {points.length > 0 ? (
        <View style={styles.captionRow}>
          <AppText tone="secondary" variant="caption">
            시작{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={points[0]?.total ?? 0}
            />
          </AppText>
          <AppText tone="secondary" variant="caption">
            현재{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={points.at(-1)?.total ?? 0}
            />
          </AppText>
        </View>
      ) : null}

      <AppText style={styles.section} variant="heading">
        자산 배분
      </AppText>
      <View accessibilityLabel="자산 배분 도넛 차트" style={styles.donutWrap}>
        <View style={styles.donut}>
          <AppText variant="heading">100%</AppText>
        </View>
      </View>
      {allocation.map((item) => (
        <View key={item.assetClass} style={styles.allocationRow}>
          <AppText variant="label">{displayLabel(item.assetClass)}</AppText>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(2, item.weight * 100)}%` },
              ]}
            />
          </View>
          <AppText style={styles.value} variant="caption">
            {Math.round(item.weight * 100)}%
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  allocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  container: { marginTop: spacing[5] },
  donut: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.brand.primary,
    borderRadius: 56,
    borderWidth: 12,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  donutWrap: { alignItems: 'center', marginTop: spacing[3] },
  fill: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    height: 8,
  },
  section: { marginTop: spacing[6] },
  track: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.full,
    flex: 1,
    height: 8,
  },
  trend: { height: 180, marginTop: spacing[3] },
  value: { textAlign: 'right', width: 36 },
});
