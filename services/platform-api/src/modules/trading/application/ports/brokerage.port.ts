import type { ExternalOrderResult } from '../../domain/trading-model.js';

export const BROKERAGE_PORT = Symbol('BROKERAGE_PORT');

export class BrokerageTransportError extends Error {
  constructor(
    readonly code:
      'TIMEOUT' | 'HTTP_ERROR' | 'INVALID_RESPONSE' | 'CIRCUIT_OPEN',
  ) {
    super(code);
  }
}

export interface BrokeragePort {
  submit(input: {
    readonly clientOrderId: string;
    readonly accountId: string;
    readonly instrumentId: string;
    readonly quantity: string;
  }): Promise<ExternalOrderResult>;
  find(clientOrderId: string): Promise<ExternalOrderResult>;
}
