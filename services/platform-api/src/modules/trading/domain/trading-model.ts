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
