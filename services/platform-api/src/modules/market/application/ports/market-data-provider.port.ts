import type {
  MarketBar,
  MarketInterval,
  MarketInstrumentInput,
  MarketQuote,
  MarketStock,
  MarketSource,
} from '../../domain/market-model.js';

export const MARKET_DATA_PROVIDER = Symbol('MARKET_DATA_PROVIDER');

export interface MarketDataProvider {
  quote(stock: MarketStock): Promise<Omit<MarketQuote, 'freshness'>>;
  bars(
    stock: MarketStock,
    interval: MarketInterval,
  ): Promise<{
    readonly bars: readonly MarketBar[];
    readonly source: MarketSource;
  }>;
  syncInstruments(): Promise<readonly MarketInstrumentInput[]>;
}
