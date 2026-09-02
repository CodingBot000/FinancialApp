import { useState } from 'react';

import type { MarketInterval } from '../../../shared/api';
import {
  AppText,
  Card,
  DemoDisclosure,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  NoticeBanner,
  PageHeader,
  Screen,
  SectionHeader,
  SegmentedControl,
  StatusChip,
  colors,
} from '../../../shared/design-system';
import { displayLabel } from '../../../shared/format/display-labels';
import { marketNameLabel } from '../model/market-display';
import {
  useMarketStockBySymbol,
  useMarketStockData,
} from '../hooks/use-market-data';
import { MarketBarSummary, MarketQuoteSummary } from './market-quote-summary';
import { StockPriceChart } from './stock-price-chart';

const INTERVALS: readonly Readonly<{
  value: MarketInterval;
  label: string;
}>[] = [
  { value: 'MINUTE', label: '분봉' },
  { value: 'DAILY', label: '일봉' },
  { value: 'WEEKLY', label: '주봉' },
  { value: 'MONTHLY', label: '월봉' },
  { value: 'YEARLY', label: '연봉' },
];

export function MarketDetailScreen({
  onBack,
  symbol,
}: {
  readonly onBack?: () => void;
  readonly symbol: string | undefined;
}) {
  const [interval, setInterval] = useState<MarketInterval>('DAILY');
  const stockQuery = useMarketStockBySymbol(symbol);
  const stock = stockQuery.data ?? undefined;
  const data = useMarketStockData(stock, interval);
  const quote = data.quote.data;
  const bars = data.bars.data;

  return (
    <Screen>
      <PageHeader
        action={
          <IconButton
            accessibilityLabel="뒤로 가기"
            onPress={onBack ?? (() => {})}
          >
            <AppText style={{ color: colors.text.primary }} variant="title2">
              ‹
            </AppText>
          </IconButton>
        }
        subtitle={
          stock
            ? `${stock.symbol} · ${marketNameLabel(stock.market)}`
            : '종목 정보를 불러오고 있습니다.'
        }
        title={stock?.name ?? '종목 상세'}
      />
      {stockQuery.isPending ? (
        <LoadingState label="종목 정보를 확인하고 있습니다." />
      ) : null}
      {stockQuery.isError ? (
        <ErrorState title="종목 정보를 확인하지 못했습니다." />
      ) : null}
      {stockQuery.isFetched && !stock ? (
        <EmptyState
          description="종목 목록에서 다시 선택해 주세요."
          title="종목을 찾을 수 없습니다."
        />
      ) : null}

      {stock ? (
        <>
          <Card variant="warm">
            <SectionHeader
              action={<StatusChip status={quote?.freshness ?? 'STALE'} />}
              title="현재가"
            />
            {data.quote.isPending ? (
              <LoadingState label="현재가를 확인하고 있습니다." />
            ) : null}
            {data.quote.isError ? (
              <ErrorState title="현재가를 확인하지 못했습니다." />
            ) : null}
            {quote ? <MarketQuoteSummary quote={quote} /> : null}
          </Card>
          <Card>
            <SectionHeader
              action={
                <AppText tone="secondary" variant="caption">
                  {displayLabel(interval)} {bars?.bars.length ?? 0}개
                </AppText>
              }
              title="가격 흐름"
            />
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
              <>
                <StockPriceChart
                  bars={bars.bars}
                  interval={interval}
                  stockName={stock.name}
                />
                {bars.bars.at(-1) ? (
                  <MarketBarSummary bar={bars.bars.at(-1)!} />
                ) : null}
              </>
            ) : null}
            {bars?.freshness === 'STALE' ? (
              <NoticeBanner
                title="최근에 저장된 가격 정보입니다."
                variant="warning"
              />
            ) : null}
          </Card>
        </>
      ) : null}
      <DemoDisclosure />
    </Screen>
  );
}
