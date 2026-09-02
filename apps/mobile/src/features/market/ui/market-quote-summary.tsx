import { StyleSheet, View } from 'react-native';

import type { MarketBar, MarketQuote } from '../../../shared/api';
import {
  AppText,
  colors,
  radius,
  spacing,
} from '../../../shared/design-system';
import {
  formatDateTime,
  formatWon,
} from '../../../shared/format/finance-format';
import {
  formatMarketRate,
  formatMarketVolume,
  marketFreshnessLabel,
  marketSourceLabel,
} from '../model/market-display';

export function MarketQuoteSummary({ quote }: { readonly quote: MarketQuote }) {
  return (
    <>
      <View style={styles.grid}>
        <QuoteMetric label="현재가" value={formatWon(quote.currentPrice)} />
        <QuoteMetric label="전일대비" value={signedWon(quote.changePrice)} />
        <QuoteMetric
          label="등락률"
          value={formatMarketRate(quote.changeRate)}
        />
        <QuoteMetric label="거래량" value={formatMarketVolume(quote.volume)} />
      </View>
      <AppText style={styles.meta} tone="secondary" variant="caption">
        {marketSourceLabel(quote.source)} ·{' '}
        {marketFreshnessLabel(quote.freshness)}
      </AppText>
      <AppText tone="secondary" variant="caption">
        최근 수집 {formatDateTime(quote.capturedAt)}
      </AppText>
    </>
  );
}

export function MarketBarSummary({ bar }: { readonly bar: MarketBar }) {
  return (
    <View style={styles.barSummary}>
      <AppText variant="bodyStrong">최근 봉 정보</AppText>
      <View style={styles.barRow}>
        <BarValue label="시가" value={formatWon(bar.open)} />
        <BarValue label="고가" value={formatWon(bar.high)} />
        <BarValue label="저가" value={formatWon(bar.low)} />
        <BarValue label="종가" value={formatWon(bar.close)} />
      </View>
      <AppText tone="secondary" variant="caption">
        거래량 {formatMarketVolume(bar.volume)}
      </AppText>
    </View>
  );
}

function QuoteMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.metric}>
      <AppText tone="secondary" variant="caption">
        {label}
      </AppText>
      <AppText variant="title2">{value}</AppText>
    </View>
  );
}

function BarValue({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.barValue}>
      <AppText tone="secondary" variant="caption">
        {label}
      </AppText>
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}

function signedWon(value: string): string {
  const formatted = formatWon(value);
  return Number(value) > 0 ? `+${formatted}` : formatted;
}

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  barSummary: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.input,
    gap: spacing[2],
    marginTop: spacing[3],
    padding: spacing[3],
  },
  barValue: { flexBasis: '46%', flexGrow: 1, gap: spacing[1] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  meta: { marginTop: spacing[3] },
  metric: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.input,
    flexBasis: '46%',
    flexGrow: 1,
    gap: spacing[1],
    minHeight: 76,
    padding: spacing[3],
  },
});
