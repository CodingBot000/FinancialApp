import { useState } from 'react';

import type { MarketInterval, MarketStock } from '../../../shared/api';
import {
  AppText,
  Card,
  DemoDisclosure,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  NoticeBanner,
  PageHeader,
  Screen,
  SearchField,
  SegmentedControl,
  SectionHeader,
  StatusChip,
  spacing,
} from '../../../shared/design-system';
import { marketNameLabel } from '../model/market-display';
import { useMarketSearch, useMarketStockData } from '../hooks/use-market-data';
import { MarketQuoteSummary } from './market-quote-summary';
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
  const { debouncedQuery, search, searchNow } = useMarketSearch(query);
  const data = useMarketStockData(selected, interval);
  const quote = data.quote.data;
  const bars = data.bars.data;
  const clearSelection = () => {
    setSelected(undefined);
    setInterval('DAILY');
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    clearSelection();
  };
  const runSearch = () => {
    clearSelection();
    searchNow();
  };

  return (
    <Screen>
      <PageHeader
        subtitle="관심 있는 종목의 현재가와 흐름을 확인하세요."
        title="종목"
      />
      <SearchField
        onChangeText={updateQuery}
        onClear={() => updateQuery('')}
        onSearch={runSearch}
        value={query}
      />
      {search.isFetching ? (
        <LoadingState label="종목을 찾고 있습니다." />
      ) : null}
      {search.isError ? <ErrorState title="종목을 찾지 못했습니다." /> : null}
      {debouncedQuery.length > 0 &&
      !search.isFetching &&
      search.data?.length === 0 ? (
        <EmptyState
          description="다른 이름이나 종목코드를 입력해 보세요."
          title="검색 결과가 없습니다."
        />
      ) : null}
      {!selected && search.data && search.data.length > 0 ? (
        <Card style={{ marginTop: spacing[3] }}>
          <SectionHeader title="검색 결과" />
          {search.data.map((stock) => (
            <ListRow
              description={`${stock.symbol} · ${marketNameLabel(stock.market)}${stock.industry ? ` · ${stock.industry}` : ''}`}
              key={stock.symbol}
              onPress={() => {
                setSelected(stock);
              }}
              selected={false}
              title={stock.name}
            />
          ))}
        </Card>
      ) : null}

      {selected ? (
        <>
          <Card variant="warm">
            <SectionHeader
              action={<StatusChip status={quote?.freshness ?? 'STALE'} />}
              title={selected.name}
            />
            <AppText tone="secondary" variant="caption">
              {selected.symbol} · {marketNameLabel(selected.market)}
              {selected.industry ? ` · ${selected.industry}` : ''}
            </AppText>
            {data.quote.isPending ? (
              <LoadingState label="현재가를 확인하고 있습니다." />
            ) : null}
            {data.quote.isError ? (
              <ErrorState title="현재가를 확인하지 못했습니다." />
            ) : null}
            {quote ? <MarketQuoteSummary quote={quote} /> : null}
          </Card>
          <Card>
            <SectionHeader title="가격 흐름" />
            <SegmentedControl
              onChange={setInterval}
              options={INTERVALS}
              value={interval}
            />
            {data.bars.isPending ? (
              <LoadingState label="가격 흐름을 확인하고 있습니다." />
            ) : null}
            {data.bars.isError ? (
              <ErrorState title="가격 흐름을 확인하지 못했습니다." />
            ) : null}
            {bars ? (
              <StockPriceChart
                bars={bars.bars}
                interval={interval}
                stockName={selected.name}
              />
            ) : null}
            {bars?.freshness === 'STALE' ? (
              <NoticeBanner
                title="최근에 저장된 가격 정보입니다."
                variant="warning"
              />
            ) : null}
          </Card>
        </>
      ) : (
        <EmptyState
          description="검색 결과에서 종목을 선택하면 가격과 차트를 볼 수 있습니다."
          title="종목을 선택하세요."
        />
      )}
      <DemoDisclosure />
    </Screen>
  );
}
