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

const LOCAL_VOLUMES: Readonly<Record<string, number>> = {
  '000660': 4_983_214,
  '005380': 1_142_807,
  '005930': 12_452_301,
  '035420': 872_641,
  '035720': 2_946_182,
  '373220': 391_527,
};

const LOCAL_MARKET_ANCHOR = new Date('2026-09-02T06:30:00.000Z');
const LOCAL_CURRENT_CHANGE_RATE = 0.016;

interface LocalIntervalProfile {
  readonly drift: number;
  readonly gapVolatility: number;
  readonly maxChange: number;
  readonly volumeMultiplier: number;
  readonly volatility: number;
  readonly wickVolatility: number;
}

const LOCAL_INTERVAL_PROFILES: Readonly<
  Record<MarketInterval, LocalIntervalProfile>
> = {
  MINUTE: {
    drift: 0,
    gapVolatility: 0.0002,
    maxChange: 0.004,
    volumeMultiplier: 0.002,
    volatility: 0.0012,
    wickVolatility: 0.0008,
  },
  DAILY: {
    drift: 0.0003,
    gapVolatility: 0.003,
    maxChange: 0.04,
    volumeMultiplier: 1,
    volatility: 0.012,
    wickVolatility: 0.006,
  },
  WEEKLY: {
    drift: 0.0015,
    gapVolatility: 0.006,
    maxChange: 0.08,
    volumeMultiplier: 5,
    volatility: 0.026,
    wickVolatility: 0.012,
  },
  MONTHLY: {
    drift: 0.005,
    gapVolatility: 0.012,
    maxChange: 0.16,
    volumeMultiplier: 22,
    volatility: 0.055,
    wickVolatility: 0.024,
  },
  YEARLY: {
    drift: 0.04,
    gapVolatility: 0.025,
    maxChange: 0.32,
    volumeMultiplier: 250,
    volatility: 0.15,
    wickVolatility: 0.05,
  },
};

@Injectable()
export class LocalMarketDataAdapter implements MarketDataProvider {
  async quote(stock: MarketStock): Promise<Omit<MarketQuote, 'freshness'>> {
    const current = LOCAL_PRICES[stock.symbol] ?? 50_000;
    const previousClose = current / (1 + LOCAL_CURRENT_CHANGE_RATE);
    const change = Math.round(current - previousClose);
    return {
      ...stock,
      currency: 'KRW',
      currentPrice: money(current),
      changePrice: money(change),
      changeRate: money(LOCAL_CURRENT_CHANGE_RATE * 100),
      volume: String(LOCAL_VOLUMES[stock.symbol] ?? 1_000_000),
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
    const baseVolume = LOCAL_VOLUMES[stock.symbol] ?? 1_000_000;
    const count = MARKET_BAR_LIMITS[interval];
    const profile = LOCAL_INTERVAL_PROFILES[interval];
    const random = seededRandom(`${stock.symbol}:${interval}`);
    const closes = localCloseSeries(base, count, interval, profile, random);
    const bars = Array.from({ length: count }, (_, index) => {
      const close = Math.round(closes[index]!);
      const previousClose = closes[Math.max(0, index - 1)]!;
      const gap = clamp(
        pseudoNormal(random) * profile.gapVolatility,
        -profile.maxChange / 3,
        profile.maxChange / 3,
      );
      const open = Math.round(previousClose * (1 + gap));
      const wick = profile.wickVolatility * (0.35 + random() * 0.65) + 0.0005;
      const high = Math.ceil(Math.max(open, close) * (1 + wick));
      const low = Math.max(
        1,
        Math.floor(Math.min(open, close) * (1 - wick * (0.7 + random() * 0.6))),
      );
      const isLatestDaily = interval === 'DAILY' && index === count - 1;
      const volume = isLatestDaily
        ? baseVolume
        : Math.max(
            1,
            Math.round(
              baseVolume * profile.volumeMultiplier * (0.55 + random() * 0.9),
            ),
          );
      return {
        bucketAt: localBucketAt(interval, count - 1 - index),
        open: money(open),
        high: money(high),
        low: money(low),
        close: money(close),
        volume: String(volume),
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

function localCloseSeries(
  latestClose: number,
  count: number,
  interval: MarketInterval,
  profile: LocalIntervalProfile,
  random: () => number,
): number[] {
  const closes = Array<number>(count);
  closes[count - 1] = latestClose;
  for (let index = count - 2; index >= 0; index -= 1) {
    const nextIndex = index + 1;
    const nextChange =
      interval === 'DAILY' && nextIndex === count - 1
        ? LOCAL_CURRENT_CHANGE_RATE
        : clamp(
            profile.drift + pseudoNormal(random) * profile.volatility,
            -profile.maxChange,
            profile.maxChange,
          );
    closes[index] = Math.max(1, closes[nextIndex]! / (1 + nextChange));
  }
  return closes;
}

function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) % 2_147_483_647;
  }
  if (state === 0) state = 1;
  return () => {
    state = (state * 48_271) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
}

function pseudoNormal(random: () => number): number {
  let value = 0;
  for (let index = 0; index < 6; index += 1) value += random();
  return (value - 3) * Math.SQRT2;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function localBucketAt(interval: MarketInterval, offset: number): string {
  const date = new Date(LOCAL_MARKET_ANCHOR);
  if (interval === 'MINUTE') date.setUTCMinutes(date.getUTCMinutes() - offset);
  else if (interval === 'DAILY') subtractBusinessDays(date, offset);
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

function subtractBusinessDays(date: Date, offset: number): void {
  let remaining = offset;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() - 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
}
