export interface BrokerageOrderRequest {
  readonly clientOrderId: string;
  readonly accountId: string;
  readonly instrumentId: string;
  readonly side: 'BUY';
  readonly quantity: string;
}

export type BrokerageOrderStatus = 'FILLED' | 'REJECTED' | 'UNKNOWN';

export interface BrokerageOrderView {
  readonly clientOrderId: string;
  readonly externalOrderId: string;
  readonly status: BrokerageOrderStatus;
  readonly side: 'BUY';
  readonly quantity: string;
  readonly unitPrice: string | null;
  readonly filledAmount: string | null;
  readonly executedAt: string | null;
}
