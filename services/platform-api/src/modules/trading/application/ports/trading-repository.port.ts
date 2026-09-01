import type {
  ExternalOrderRequest,
  ExternalOrderResult,
  OrderRequest,
  OrderPage,
  OrderView,
  PreparedOrder,
  QuoteRequest,
  QuoteView,
  ReconciliationClaim,
} from '../../domain/trading-model.js';

export const TRADING_REPOSITORY = Symbol('TRADING_REPOSITORY');

export interface TradingRepository {
  quoteInstrument(
    userId: string,
    request: QuoteRequest,
  ): Promise<string | undefined>;
  createQuote(
    userId: string,
    request: QuoteRequest,
    unitPrice: string,
  ): Promise<QuoteView | undefined>;
  prepareOrder(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    request: OrderRequest,
    traceId?: string,
  ): Promise<
    | { readonly kind: 'prepared'; readonly value: PreparedOrder }
    | { readonly kind: 'idempotency_conflict' }
    | { readonly kind: 'quote_expired' }
    | { readonly kind: 'insufficient_funds' }
    | { readonly kind: 'not_found' }
  >;
  submission(
    userId: string,
    orderId: string,
  ): Promise<ExternalOrderRequest | undefined>;
  applyExternalResult(
    orderId: string,
    result: ExternalOrderResult,
    source: 'SUBMISSION' | 'RECONCILIATION',
    traceId: string,
    reconciliationJobId?: string,
  ): Promise<OrderView>;
  markUnknown(
    orderId: string,
    reasonCode: string,
    traceId: string,
  ): Promise<OrderView>;
  findOrder(userId: string, orderId: string): Promise<OrderView | undefined>;
  listOrders(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<OrderPage>;
  claimReconciliation(
    workerId: string,
    now: Date,
    staleBefore: Date,
  ): Promise<ReconciliationClaim | undefined>;
  rescheduleReconciliation(
    claim: ReconciliationClaim,
    reasonCode: string,
    retryAt: Date,
    maxAttempts: number,
  ): Promise<void>;
}
