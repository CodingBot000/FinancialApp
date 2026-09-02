import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MarketInterval, MarketStock } from '../../../shared/api';
import {
  formatDateTime,
  formatWon,
} from '../../../shared/format/finance-format';
import { displayLabel } from '../../../shared/format/display-labels';
import {
  formatMarketRate,
  formatMarketVolume,
  marketFreshnessLabel,
  marketNameLabel,
  marketSourceLabel,
} from '../model/market-display';
import { useMarketSearch, useMarketStockData } from '../hooks/use-market-data';
import { StockPriceChart } from './stock-price-chart';

const INTERVALS: readonly Readonly<{ value: MarketInterval; label: string }>[] =
  [
    { value: 'MINUTE', label: '분봉' },
    { value: 'DAILY', label: '일봉' },
    { value: 'WEEKLY', label: '주봉' },
    { value: 'MONTHLY', label: '월봉' },
    { value: 'YEARLY', label: '연봉' },
  ];

export function MarketScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MarketStock>();
  const [interval, setInterval] = useState<MarketInterval>('DAILY');
  const { debouncedQuery, search } = useMarketSearch(query);
  const data = useMarketStockData(selected, interval);
  const quote = data.quote.data;
  const bars = data.bars.data;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>시장 데이터</Text>
        <Text accessibilityRole="header" style={styles.title}>
          종목 조회
        </Text>
        <Text style={styles.description}>
          외부 금융 API에서 종목 정보와 가격 흐름을 확인합니다.
        </Text>

        <TextInput
          accessibilityLabel="종목 검색"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="종목명 또는 종목코드"
          placeholderTextColor="#718198"
          style={styles.searchInput}
          value={query}
        />

        {search.isFetching ? (
          <View style={styles.inlineState}>
            <ActivityIndicator color="#39e8b5" />
            <Text style={styles.muted}>종목을 검색하는 중</Text>
          </View>
        ) : null}
        {search.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            종목 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
          </Text>
        ) : null}
        {debouncedQuery.length > 0 &&
        !search.isFetching &&
        search.data?.length === 0 ? (
          <Text style={styles.muted}>검색 결과가 없습니다.</Text>
        ) : null}
        {search.data && search.data.length > 0 ? (
          <View style={styles.resultsCard}>
            {search.data.map((stock) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: selected?.symbol === stock.symbol,
                }}
                key={stock.symbol}
                onPress={() => setSelected(stock)}
                style={styles.resultRow}
              >
                <View>
                  <Text style={styles.resultName}>{stock.name}</Text>
                  <Text style={styles.muted}>
                    {stock.symbol} · {marketNameLabel(stock.market)}
                  </Text>
                </View>
                {stock.industry ? (
                  <Text style={styles.industry}>{stock.industry}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {selected ? (
          <View style={styles.card}>
            <View style={styles.stockHeader}>
              <View>
                <Text style={styles.sectionTitle}>{selected.name}</Text>
                <Text style={styles.muted}>
                  {selected.symbol} · {marketNameLabel(selected.market)}
                </Text>
              </View>
              <Text style={styles.source}>
                {quote ? marketSourceLabel(quote.source) : '-'}
              </Text>
            </View>
            {data.quote.isPending ? (
              <View style={styles.inlineState}>
                <ActivityIndicator color="#39e8b5" />
                <Text style={styles.muted}>현재가를 불러오는 중</Text>
              </View>
            ) : null}
            {data.quote.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                현재가를 불러오지 못했습니다. 다시 시도해 주세요.
              </Text>
            ) : null}
            {quote ? (
              <>
                <Text style={styles.price}>
                  {formatWon(quote.currentPrice)}
                </Text>
                <Text
                  style={
                    quote.changePrice.startsWith('-')
                      ? styles.negative
                      : styles.positive
                  }
                >
                  전일 대비 {formatWon(quote.changePrice)} (
                  {formatMarketRate(quote.changeRate)})
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.muted}>
                    거래량 {formatMarketVolume(quote.volume)}
                  </Text>
                  <Text style={styles.muted}>
                    {formatDateTime(quote.capturedAt)}
                  </Text>
                </View>
                <Text style={styles.freshness}>
                  {marketFreshnessLabel(quote.freshness)}
                </Text>
              </>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>종목을 선택하세요</Text>
            <Text style={styles.muted}>
              검색 결과를 선택하면 가격과 차트가 표시됩니다.
            </Text>
          </View>
        )}

        {selected ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>가격 차트</Text>
              <Text style={styles.muted}>{displayLabel(interval)}</Text>
            </View>
            <View style={styles.intervalRow}>
              {INTERVALS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: interval === option.value }}
                  key={option.value}
                  onPress={() => setInterval(option.value)}
                  style={[
                    styles.intervalButton,
                    interval === option.value && styles.intervalSelected,
                  ]}
                >
                  <Text style={styles.intervalText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            {data.bars.isPending ? (
              <View style={styles.inlineState}>
                <ActivityIndicator color="#39e8b5" />
                <Text style={styles.muted}>가격 흐름을 불러오는 중</Text>
              </View>
            ) : null}
            {data.bars.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                차트 데이터를 불러오지 못했습니다. 다시 시도해 주세요.
              </Text>
            ) : null}
            {bars ? (
              <StockPriceChart bars={bars.bars} stockName={selected.name} />
            ) : null}
            {bars?.freshness === 'STALE' ? (
              <Text style={styles.warning}>
                최근에 저장된 가격 데이터입니다.
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.disclaimer}>
          외부 시세는 지연되거나 일시적으로 제공되지 않을 수 있습니다. 투자
          권유가 아닙니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  content: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 28 },
  description: {
    color: '#91a1b7',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  disclaimer: { color: '#718198', fontSize: 11, lineHeight: 18, marginTop: 22 },
  emptyCard: {
    borderColor: '#22334a',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  error: { color: '#f8b4b4', fontSize: 13, lineHeight: 19, marginTop: 12 },
  eyebrow: { color: '#39e8b5', fontSize: 11, fontWeight: '800' },
  freshness: { color: '#39e8b5', fontSize: 11, marginTop: 10 },
  industry: {
    color: '#718198',
    flexShrink: 1,
    fontSize: 10,
    marginLeft: 12,
    maxWidth: 140,
    textAlign: 'right',
  },
  inlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  intervalButton: {
    alignItems: 'center',
    borderColor: '#30435d',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  intervalRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  intervalSelected: { backgroundColor: '#163c34', borderColor: '#39e8b5' },
  intervalText: { color: '#dce5f0', fontSize: 11, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  muted: { color: '#91a1b7', fontSize: 11, lineHeight: 18, marginTop: 6 },
  negative: { color: '#f8a7a7', fontSize: 13, marginTop: 8 },
  positive: { color: '#39e8b5', fontSize: 13, marginTop: 8 },
  price: { color: '#f4f7fb', fontSize: 31, fontWeight: '800', marginTop: 22 },
  resultName: { color: '#f4f7fb', fontSize: 15, fontWeight: '800' },
  resultRow: {
    alignItems: 'center',
    borderBottomColor: '#22334a',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingVertical: 10,
  },
  resultsCard: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  safe: { backgroundColor: '#07111f', flex: 1 },
  searchInput: {
    backgroundColor: '#101d2e',
    borderColor: '#33455f',
    borderRadius: 12,
    borderWidth: 1,
    color: '#f4f7fb',
    fontSize: 15,
    marginTop: 20,
    minHeight: 50,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: '#f4f7fb', fontSize: 18, fontWeight: '800' },
  source: { color: '#39e8b5', fontSize: 10, fontWeight: '700', marginLeft: 12 },
  stockHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: '#f4f7fb', fontSize: 31, fontWeight: '800', marginTop: 14 },
  warning: { color: '#f6c76a', fontSize: 11, marginTop: 12 },
});
