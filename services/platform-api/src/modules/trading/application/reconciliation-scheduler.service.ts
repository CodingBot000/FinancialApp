import { randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import { TradingService } from './trading.service.js';

function positiveInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class ReconciliationSchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private running = false;
  private timer?: ReturnType<typeof setInterval>;
  private readonly workerId = `order-worker-${randomUUID()}`;

  constructor(
    @Inject(TradingService) private readonly tradingService: TradingService,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.ORDER_RECONCILIATION_ENABLED !== 'true') return;
    this.timer = setInterval(
      () => {
        void this.tickSafely();
      },
      positiveInteger('ORDER_RECONCILIATION_TICK_MS', 5000),
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
      const batch = positiveInteger('ORDER_RECONCILIATION_BATCH_SIZE', 10);
      for (let index = 0; index < batch; index += 1) {
        if (!(await this.tradingService.reconcileOne(this.workerId, now)))
          break;
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
