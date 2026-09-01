import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';

import {
  MYDATA_REPOSITORY,
  type MyDataRepository,
} from './ports/mydata-repository.port.js';
import { MyDataService } from './mydata.service.js';

function positiveInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class MyDataSchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private running = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(MYDATA_REPOSITORY)
    private readonly repository: MyDataRepository,
    @Inject(MyDataService) private readonly myDataService: MyDataService,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.MYDATA_SCHEDULER_ENABLED !== 'true') return;
    const tickMilliseconds = positiveInteger('MYDATA_SCHEDULER_TICK_MS', 5000);
    this.timer = setInterval(() => {
      void this.tickSafely();
    }, tickMilliseconds);
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
      const leaseMilliseconds = positiveInteger(
        'MYDATA_SYNC_LEASE_TIMEOUT_MS',
        30_000,
      );
      const retryMilliseconds = positiveInteger(
        'MYDATA_SYNC_RETRY_BACKOFF_MS',
        5000,
      );
      const scheduleMilliseconds = positiveInteger(
        'MYDATA_SYNC_SCHEDULE_INTERVAL_MS',
        900_000,
      );
      const maxAttempts = positiveInteger('MYDATA_SYNC_MAX_ATTEMPTS', 3);
      const batchSize = positiveInteger('MYDATA_SYNC_CLAIM_BATCH_SIZE', 10);
      const retryAt = new Date(now.getTime() + retryMilliseconds);

      await this.repository.recoverStaleSyncs(
        new Date(now.getTime() - leaseMilliseconds),
        maxAttempts,
        retryAt,
      );
      const dueConnections = await this.repository.listDueConnections(
        new Date(now.getTime() - scheduleMilliseconds),
        now,
        batchSize,
      );
      for (const connection of dueConnections) {
        await this.repository.createSync(
          connection.userId,
          connection.connectionId,
        );
      }
      const dueSyncIds = await this.repository.listDueSyncIds(now, batchSize);
      await Promise.all(
        dueSyncIds.map((syncId) => this.myDataService.runSync(syncId)),
      );
    } finally {
      this.running = false;
    }
  }

  private async tickSafely(): Promise<void> {
    try {
      await this.tick();
    } catch {
      // A later scheduler tick retries transient startup/database failures.
    }
  }
}
