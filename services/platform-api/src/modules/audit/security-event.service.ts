import { createHmac, randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../core/database/database.tokens.js';
import { finappSecurityEvent } from '../../database/schema.js';

export type SecurityEventType =
  'AUTHENTICATION_FAILURE' | 'AUTHORIZATION_FAILURE' | 'SUSPICIOUS_REQUEST';

const METADATA_ALLOWLIST = new Set(['requiredScopeCount', 'syntheticData']);

@Injectable()
export class SecurityEventService {
  private readonly database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool);
  }

  async record(event: {
    readonly eventType: SecurityEventType;
    readonly reasonCode: string;
    readonly traceId: string;
    readonly sourceIp?: string;
    readonly userId?: string | null;
    readonly metadata?: Readonly<Record<string, number | boolean>>;
  }): Promise<void> {
    const metadata = event.metadata ?? {};
    if (Object.keys(metadata).some((key) => !METADATA_ALLOWLIST.has(key))) {
      throw new Error('Security metadata contains a non-allowlisted key.');
    }
    await this.database.insert(finappSecurityEvent).values({
      id: randomUUID(),
      occurredAt: new Date(),
      userId: event.userId ?? null,
      eventType: event.eventType,
      result: 'FAILURE',
      reasonCode: event.reasonCode.slice(0, 80),
      traceId: (event.traceId || 'unavailable').slice(0, 100),
      sourceIpHash: this.hashSourceIp(event.sourceIp),
      metadata,
    });
  }

  async recordSafely(
    event: Parameters<SecurityEventService['record']>[0],
  ): Promise<void> {
    try {
      await this.record(event);
    } catch {
      // Authentication and authorization must remain fail-closed if audit persistence is unavailable.
    }
  }

  private hashSourceIp(sourceIp: string | undefined): string | null {
    const encoded = process.env.FINAPP_SECURITY_EVENT_HASH_KEY_BASE64;
    if (sourceIp === undefined || encoded === undefined) return null;
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32) return null;
    try {
      return createHmac('sha256', key).update(sourceIp, 'utf8').digest('hex');
    } finally {
      key.fill(0);
    }
  }
}
