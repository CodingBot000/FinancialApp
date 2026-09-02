import { Injectable } from '@nestjs/common';

import type { MarketDataProvider } from '../../application/ports/market-data-provider.port.js';
import type {
  MarketBar,
  MarketInterval,
  MarketInstrumentInput,
  MarketQuote,
  MarketStock,
} from '../../domain/market-model.js';

const LOCAL_STOCKS: readonly MarketInstrumentInput[] = [
  localStock('005930', '삼성전자', 'KOSPI', '전자부품 제조업'),
  localStock('000660', 'SK하이닉스', 'KOSPI', '반도체 제조업'),
  localStock(
    '035420',
    'NAVER',
    'KOSPI',
    '자료처리 및 인터넷 정보매개 서비스업',
  ),
  localStock('005380', '현대차', 'KOSPI', '자동차 제조업'),
  localStock(
    '035720',
    '카카오',
    'KOSPI',
    '자료처리 및 인터넷 정보매개 서비스업',
  ),
  localStock('373220', 'LG에너지솔루션', 'KOSPI', '일차전지 제조업'),
];

const LOCAL_PRICES: Readonly<Record<string, number>> = {
  '000660': 182_500,
  '005380': 241_000,
  '005930': 74_200,
  '035420': 238_000,
  '035720': 42_500,
  '373220': 356_000,
};

@Injectable()
export class LocalMarketDataAdapter implements MarketDataProvider {
  async quote(stock: MarketStock): Promise<Omit<MarketQuote, 'freshness'>> {
    const current = LOCAL_PRICES[stock.symbol] ?? 50_000;
    const change = Math.round(current * 0.016);
    return {
      ...stock,
      currency: 'KRW',
      currentPrice: money(current),
      changePrice: money(change),
      changeRate: '1.6000',
      volume: '12452301',
      capturedAt: new Date().toISOString(),
      source: 'LOCAL',
    };
  }

  async bars(
    stock: MarketStock,
    interval: MarketInterval,
  ): Promise<{
    readonly bars: readonly MarketBar[];
    readonly source: 'LOCAL';
  }> {
    const base = LOCAL_PRICES[stock.symbol] ?? 50_000;
    const count = interval === 'MINUTE' ? 60 : interval === 'YEARLY' ? 8 : 30;
    const step =
      interval === 'MINUTE'
        ? 60 * 60 * 1000
        : interval === 'DAILY'
          ? 24 * 60 * 60 * 1000
          : interval === 'WEEKLY'
            ? 7 * 24 * 60 * 60 * 1000
            : interval === 'MONTHLY'
              ? 30 * 24 * 60 * 60 * 1000
              : 365 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const bars = Array.from({ length: count }, (_, index) => {
      const wave = ((index % 7) - 3) * 0.004;
      const close = Math.round(base * (0.91 + index / (count * 11) + wave));
      const open = Math.round(close * 0.996);
      const high = Math.round(close * 1.012);
      const low = Math.round(close * 0.984);
      return {
        bucketAt: new Date(now - (count - index) * step).toISOString(),
        open: money(open),
        high: money(high),
        low: money(low),
        close: money(close),
        volume: String(1_000_000 + index * 12_345),
      } satisfies MarketBar;
    });
    return { bars, source: 'LOCAL' };
  }

  async syncInstruments(): Promise<readonly MarketInstrumentInput[]> {
    return LOCAL_STOCKS;
  }
}

function localStock(
  symbol: string,
  name: string,
  market: 'KOSPI' | 'KOSDAQ',
  industry: string,
): MarketInstrumentInput {
  return {
    symbol,
    name,
    market,
    industry,
    source: 'KIS_MASTER',
    raw: { source: 'LOCAL_FIXTURE', symbol },
  };
}

function money(value: number): string {
  return `${value.toFixed(4)}`;
}
