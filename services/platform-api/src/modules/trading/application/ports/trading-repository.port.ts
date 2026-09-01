import type {
  OrderRequest,
  PreparedOrder,
  QuoteRequest,
  QuoteView,
} from '../../domain/trading-model.js';

export const TRADING_REPOSITORY = Symbol('TRADING_REPOSITORY');

export interface TradingRepository {
  createQuote(
    userId: string,
    request: QuoteRequest,
  ): Promise<QuoteView | undefined>;
  prepareOrder(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    request: OrderRequest,
  ): Promise<
    | { readonly kind: 'prepared'; readonly value: PreparedOrder }
    | { readonly kind: 'idempotency_conflict' }
    | { readonly kind: 'quote_expired' }
    | { readonly kind: 'insufficient_funds' }
    | { readonly kind: 'not_found' }
  >;
}
