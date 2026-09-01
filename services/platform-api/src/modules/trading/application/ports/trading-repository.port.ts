import type { QuoteRequest, QuoteView } from '../../domain/trading-model.js';

export const TRADING_REPOSITORY = Symbol('TRADING_REPOSITORY');

export interface TradingRepository {
  createQuote(
    userId: string,
    request: QuoteRequest,
  ): Promise<QuoteView | undefined>;
}
