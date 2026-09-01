import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { SIMULATOR_DATABASE_POOL } from '../../core/database/database.tokens.js';
import {
  finappSimInstrument,
  finappSimMarketPrice,
} from '../../database/schema.js';

@Injectable()
export class MarketRepository {
  private readonly database;

  constructor(@Inject(SIMULATOR_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool);
  }

  instruments() {
    return this.database
      .select({
        instrumentId: finappSimInstrument.instrumentCode,
        displayName: finappSimInstrument.displayName,
        assetClass: finappSimInstrument.assetClass,
        currency: finappSimInstrument.currency,
        status: finappSimInstrument.status,
      })
      .from(finappSimInstrument)
      .where(eq(finappSimInstrument.status, 'ACTIVE'));
  }

  async prices(instrumentIds: readonly string[]) {
    if (instrumentIds.length === 0) return [];
    const rows = await this.database
      .select({
        instrumentId: finappSimInstrument.instrumentCode,
        price: finappSimMarketPrice.price,
        currency: finappSimMarketPrice.currency,
        asOfAt: finappSimMarketPrice.asOfAt,
      })
      .from(finappSimMarketPrice)
      .innerJoin(
        finappSimInstrument,
        eq(finappSimMarketPrice.instrumentId, finappSimInstrument.id),
      )
      .where(
        and(
          inArray(finappSimInstrument.instrumentCode, [...instrumentIds]),
          eq(finappSimInstrument.status, 'ACTIVE'),
        ),
      )
      .orderBy(desc(finappSimMarketPrice.asOfAt));

    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latest.has(row.instrumentId)) latest.set(row.instrumentId, row);
    }
    return [...latest.values()];
  }

  history(instrumentId: string) {
    return this.database
      .select({
        instrumentId: finappSimInstrument.instrumentCode,
        price: finappSimMarketPrice.price,
        currency: finappSimMarketPrice.currency,
        asOfAt: finappSimMarketPrice.asOfAt,
      })
      .from(finappSimMarketPrice)
      .innerJoin(
        finappSimInstrument,
        eq(finappSimMarketPrice.instrumentId, finappSimInstrument.id),
      )
      .where(eq(finappSimInstrument.instrumentCode, instrumentId))
      .orderBy(desc(finappSimMarketPrice.asOfAt));
  }
}
