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
  readonly status: 'PENDING_SUBMISSION';
  readonly side: 'BUY';
  readonly quantity: string;
  readonly estimatedAmount: string;
  readonly filledAmount: null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly statusRefreshRecommendedAfterMs: 2000;
}

export interface PreparedOrder {
  readonly created: boolean;
  readonly order: OrderView;
}
