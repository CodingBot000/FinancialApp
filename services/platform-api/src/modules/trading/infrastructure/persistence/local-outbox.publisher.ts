import { Inject, Injectable } from '@nestjs/common';

import type { OutboxPublisher } from '../../application/ports/outbox-publisher.port.js';
import {
  TRADING_REPOSITORY,
  type TradingRepository,
} from '../../application/ports/trading-repository.port.js';
import type { OutboxClaim } from '../../domain/trading-model.js';

const LOCAL_CONSUMER_NAME = 'finapp-local-settlement-v1';

@Injectable()
export class LocalOutboxPublisher implements OutboxPublisher {
  constructor(
    @Inject(TRADING_REPOSITORY)
    private readonly repository: TradingRepository,
  ) {}

  publish(claim: OutboxClaim): Promise<'DELIVERED' | 'DUPLICATE'> {
    return this.repository.recordOutboxDelivery(claim, LOCAL_CONSUMER_NAME);
  }
}
