import { Injectable } from '@nestjs/common';

import type { MarketDataProvider } from '../../application/ports/market-data-provider.port.js';
import type {
  MarketBar,
  MarketInterval,
  MarketInstrumentInput,
  MarketQuote,
  MarketStock,
} from '../../domain/market-model.js';
import { MARKET_BAR_LIMITS } from '../../domain/market-model.js';
import { normalizeMarketBucketAt } from '../../domain/market-bucket.js';

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

const LOCAL_MARKET_ANCHOR = new Date('2026-09-02T00:00:00.000Z');

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
    const count = MARKET_BAR_LIMITS[interval];
    const finalWave = localWave(count - 1);
    const bars = Array.from({ length: count }, (_, index) => {
      const progress = count === 1 ? 1 : index / (count - 1);
      const close = Math.round(
        base * (0.92 + progress * 0.08 + localWave(index) - finalWave),
      );
      const open = Math.round(close * 0.996);
      const high = Math.round(close * 1.012);
      const low = Math.round(close * 0.984);
      return {
        bucketAt: localBucketAt(interval, count - 1 - index),
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

function localWave(index: number): number {
  return Math.sin(index / 6) * 0.012 + Math.sin(index / 17) * 0.006;
}

function localBucketAt(interval: MarketInterval, offset: number): string {
  const date = new Date(LOCAL_MARKET_ANCHOR);
  if (interval === 'MINUTE') date.setUTCMinutes(date.getUTCMinutes() - offset);
  else if (interval === 'DAILY') date.setUTCDate(date.getUTCDate() - offset);
  else if (interval === 'WEEKLY')
    date.setUTCDate(date.getUTCDate() - offset * 7);
  else if (interval === 'MONTHLY') {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - offset);
  } else {
    date.setUTCMonth(0, 1);
    date.setUTCFullYear(date.getUTCFullYear() - offset);
  }
  const bucketAt = normalizeMarketBucketAt(date.toISOString(), interval);
  if (bucketAt === undefined)
    throw new Error('Local market bucket is invalid.');
  return bucketAt;
}
