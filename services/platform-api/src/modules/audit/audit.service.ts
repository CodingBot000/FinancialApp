import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../core/database/database.tokens.js';
import { finappAuditEvent } from '../../database/schema.js';

export type AuditAction =
  | 'MYDATA_CONNECTION_CREATED'
  | 'MYDATA_SYNC_STARTED'
  | 'MYDATA_SYNC_COMPLETED'
  | 'RISK_PROFILE_UPDATED'
  | 'SIMULATION_EXECUTED'
  | 'DEV_SCENARIO_CHANGED';

const METADATA_ALLOWLIST = new Set([
  'institutionCode',
  'mode',
  'operation',
  'status',
  'syntheticData',
]);

@Injectable()
export class AuditService {
  private readonly database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool);
  }

  async record(event: {
    readonly userId: string | null;
    readonly action: AuditAction;
    readonly resourceType: string;
    readonly resourceId: string | null;
    readonly traceId: string;
    readonly metadata?: Readonly<Record<string, string | boolean>>;
  }): Promise<void> {
    const metadata = event.metadata ?? {};
    if (Object.keys(metadata).some((key) => !METADATA_ALLOWLIST.has(key))) {
      throw new Error('Audit metadata contains a non-allowlisted key.');
    }
    await this.database.insert(finappAuditEvent).values({
      id: randomUUID(),
      occurredAt: new Date(),
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      result: 'SUCCESS',
      reasonCode: null,
      traceId: (event.traceId || 'unavailable').slice(0, 100),
      metadata,
    });
  }
}
