import type { OutboxClaim } from '../../domain/trading-model.js';

export const OUTBOX_PUBLISHER = Symbol('OUTBOX_PUBLISHER');

export interface OutboxPublisher {
  publish(claim: OutboxClaim): Promise<'DELIVERED' | 'DUPLICATE'>;
}
