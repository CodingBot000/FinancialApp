import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../core/database/database.tokens.js';
import { platformMetrics } from '../../core/observability/metrics-registry.js';
import type { PlatformReadinessResponse } from './health-model.js';

function positiveInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class HealthService {
  constructor(@Inject(PLATFORM_DATABASE_POOL) private readonly pool: Pool) {}

  async readiness(): Promise<PlatformReadinessResponse> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.pool.query('SELECT 1 AS finapp_readiness'),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Database readiness timed out.')),
            positiveInteger('READINESS_DATABASE_TIMEOUT_MS', 1000),
          );
          timer.unref();
        }),
      ]);
      return this.response('ready', 'up');
    } catch {
      return this.response('not_ready', 'down');
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  metrics() {
    return {
      service: 'platform-api' as const,
      datasetVersion: process.env.FINAPP_DATASET_VERSION ?? 'baseline-v1',
      uptimeSeconds: Math.floor(process.uptime()),
      databasePool: {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      },
      counters: platformMetrics.snapshot(),
    };
  }

  private response(
    status: 'ready' | 'not_ready',
    database: 'up' | 'down',
  ): PlatformReadinessResponse {
    return {
      status,
      service: 'platform-api',
      datasetVersion: process.env.FINAPP_DATASET_VERSION ?? 'baseline-v1',
      checks: { database },
    };
  }
}
