import type {
  MarketBar,
  MarketInterval,
  MarketInstrumentInput,
  MarketQuote,
  MarketStock,
  MarketSource,
} from '../../domain/market-model.js';

export const MARKET_REPOSITORY = Symbol('MARKET_REPOSITORY');

export interface MarketRepository {
  searchStocks(query: string, limit: number): Promise<readonly MarketStock[]>;
  findStock(symbol: string): Promise<MarketStock | undefined>;
  latestQuote(symbol: string): Promise<MarketQuote | undefined>;
  saveQuote(quote: Omit<MarketQuote, 'freshness'>): Promise<MarketQuote>;
  listBars(
    symbol: string,
    interval: MarketInterval,
    limit: number,
  ): Promise<readonly MarketBar[]>;
  upsertBars(
    symbol: string,
    interval: MarketInterval,
    bars: readonly MarketBar[],
    source: MarketSource,
  ): Promise<void>;
  replaceBars(
    symbol: string,
    interval: MarketInterval,
    bars: readonly MarketBar[],
    source: MarketSource,
  ): Promise<void>;
  upsertInstruments(
    instruments: readonly MarketInstrumentInput[],
  ): Promise<number>;
}
