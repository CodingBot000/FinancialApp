export interface QuoteRequest {
  readonly accountId: string;
  readonly instrumentId: string;
  readonly side: 'BUY';
  readonly quantity: string;
}

export interface QuoteView {
  readonly quoteId: string;
  readonly side: 'BUY';
  readonly quantity: string;
  readonly unitPrice: string;
  readonly estimatedAmount: string;
  readonly fee: string;
  readonly currency: 'KRW';
  readonly expiresAt: string;
  readonly syntheticQuote: true;
}

export interface OrderRequest {
  readonly quoteId: string;
  readonly accountId: string;
  readonly instrumentId: string;
  readonly side: 'BUY';
  readonly quantity: string;
}

export interface OrderView {
  readonly orderId: string;
  readonly status:
    'PENDING_SUBMISSION' | 'UNKNOWN' | 'FILLED' | 'REJECTED' | 'FAILED';
  readonly side: 'BUY';
  readonly quantity: string;
  readonly estimatedAmount: string;
  readonly filledAmount: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly statusRefreshRecommendedAfterMs: 2000 | null;
}

export interface PreparedOrder {
  readonly created: boolean;
  readonly order: OrderView;
}

export interface OrderPage {
  readonly items: readonly OrderView[];
  readonly nextCursor: string | null;
}

export interface ExternalOrderRequest {
  readonly orderId: string;
  readonly userId: string;
  readonly clientOrderId: string;
  readonly accountId: string;
  readonly instrumentId: string;
  readonly quantity: string;
}

export interface ExternalOrderResult {
  readonly clientOrderId: string;
  readonly externalOrderId: string;
  readonly status: 'FILLED' | 'REJECTED' | 'UNKNOWN';
  readonly quantity: string;
  readonly unitPrice: string | null;
  readonly filledAmount: string | null;
  readonly executedAt: string | null;
}

export interface ReconciliationClaim {
  readonly jobId: string;
  readonly orderId: string;
  readonly clientOrderId: string;
  readonly quantity: string;
  readonly attempt: number;
}
