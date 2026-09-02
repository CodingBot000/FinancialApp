export const MARKET_INTERVALS = [
  'MINUTE',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
] as const;

export type MarketInterval = (typeof MARKET_INTERVALS)[number];
export type MarketFreshness = 'FRESH' | 'STALE';
export type MarketSource = 'KIS' | 'LOCAL';

export interface MarketStock {
  readonly symbol: string;
  readonly name: string;
  readonly market: 'KOSPI' | 'KOSDAQ';
  readonly industry: string | null;
}

export interface MarketQuote extends MarketStock {
  readonly currency: 'KRW';
  readonly currentPrice: string;
  readonly changePrice: string;
  readonly changeRate: string;
  readonly volume: string;
  readonly capturedAt: string;
  readonly source: MarketSource;
  readonly freshness: MarketFreshness;
}

export interface MarketBar {
  readonly bucketAt: string;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
}

export interface MarketBars {
  readonly symbol: string;
  readonly interval: MarketInterval;
  readonly source: MarketSource;
  readonly freshness: MarketFreshness;
  readonly bars: readonly MarketBar[];
}

export interface MarketInstrumentInput {
  readonly symbol: string;
  readonly name: string;
  readonly market: 'KOSPI' | 'KOSDAQ';
  readonly industry?: string | null;
  readonly standardCode?: string | null;
  readonly basePrice?: string | null;
  readonly listedAt?: string | null;
  readonly source: 'KIS_MASTER';
  readonly raw: Readonly<Record<string, unknown>>;
}
