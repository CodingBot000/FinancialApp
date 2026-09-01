import { randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import {
  OUTBOX_PUBLISHER,
  type OutboxPublisher,
} from './ports/outbox-publisher.port.js';
import {
  TRADING_REPOSITORY,
  type TradingRepository,
} from './ports/trading-repository.port.js';

function positiveInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class OutboxSchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private running = false;
  private timer?: ReturnType<typeof setInterval>;
  private readonly workerId = `outbox-worker-${randomUUID()}`;

  constructor(
    @Inject(TRADING_REPOSITORY)
    private readonly repository: TradingRepository,
    @Inject(OUTBOX_PUBLISHER)
    private readonly publisher: OutboxPublisher,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.OUTBOX_PUBLISHER_ENABLED !== 'true') return;
    this.timer = setInterval(
      () => {
        void this.tickSafely();
      },
      positiveInteger('OUTBOX_PUBLISHER_TICK_MS', 5000),
    );
    this.timer.unref();
    void this.tickSafely();
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const batchSize = positiveInteger('OUTBOX_PUBLISHER_BATCH_SIZE', 10);
      const leaseMilliseconds = positiveInteger(
        'OUTBOX_PUBLISHER_LEASE_MS',
        30_000,
      );
      const retryMilliseconds = positiveInteger(
        'OUTBOX_PUBLISHER_BACKOFF_MS',
        5000,
      );
      const maxAttempts = positiveInteger('OUTBOX_PUBLISHER_MAX_ATTEMPTS', 5);

      for (let index = 0; index < batchSize; index += 1) {
        const claim = await this.repository.claimOutbox(
          this.workerId,
          now,
          new Date(now.getTime() - leaseMilliseconds),
        );
        if (claim === undefined) break;
        try {
          await this.publisher.publish(claim);
          await this.repository.completeOutbox(claim, new Date());
        } catch {
          await this.repository.rescheduleOutbox(
            claim,
            'OUTBOX_PUBLISH_FAILED',
            new Date(now.getTime() + retryMilliseconds),
            maxAttempts,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async tickSafely(): Promise<void> {
    try {
      await this.tick();
    } catch {
      // A later local worker tick retries transient startup/database failures.
    }
  }
}
