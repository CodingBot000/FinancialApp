import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { SIMULATOR_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappSimMarketPrice,
  finappSimOrder,
  finappSimScenario,
} from '../../../../database/schema.js';
import { BALANCED_WORKER_IDS } from '../../../account/account.repository.js';
import type { ScenarioRepository } from '../../application/ports/scenario-repository.port.js';
import type { ScenarioMode } from '../../domain/scenario-mode.js';

const GLOBAL_SCENARIO_ID = '71000000-0000-4000-8000-000000000001';
const MARKET_PRICE_ID = '72000000-0000-4000-8000-000000000001';
const MARKET_AS_OF = new Date('2026-09-01T00:00:00.000Z');

@Injectable()
export class DrizzleScenarioRepository implements ScenarioRepository {
  private readonly database;

  constructor(@Inject(SIMULATOR_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool);
  }

  async current(): Promise<ScenarioMode> {
    const rows = await this.database
      .select({ mode: finappSimScenario.mode })
      .from(finappSimScenario)
      .where(eq(finappSimScenario.scopeKey, 'GLOBAL'))
      .limit(1);
    return (rows[0]?.mode as ScenarioMode | undefined) ?? 'NORMAL';
  }

  async reset(): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.delete(finappSimOrder);
      await transaction
        .insert(finappSimMarketPrice)
        .values({
          id: MARKET_PRICE_ID,
          instrumentId: BALANCED_WORKER_IDS.instrumentId,
          price: '125000.0000',
          currency: 'KRW',
          asOfAt: MARKET_AS_OF,
        })
        .onConflictDoUpdate({
          target: [
            finappSimMarketPrice.instrumentId,
            finappSimMarketPrice.asOfAt,
          ],
          set: { price: '125000.0000', currency: 'KRW' },
        });
      await transaction
        .insert(finappSimScenario)
        .values({
          id: GLOBAL_SCENARIO_ID,
          scopeType: 'GLOBAL',
          scopeKey: 'GLOBAL',
          mode: 'NORMAL',
          config: {},
          updatedAt: MARKET_AS_OF,
        })
        .onConflictDoUpdate({
          target: [finappSimScenario.scopeType, finappSimScenario.scopeKey],
          set: { mode: 'NORMAL', config: {}, updatedAt: MARKET_AS_OF },
        });
    });
  }

  async seed(): Promise<void> {
    await this.reset();
  }

  async set(mode: ScenarioMode): Promise<void> {
    await this.database
      .insert(finappSimScenario)
      .values({
        id: GLOBAL_SCENARIO_ID,
        scopeType: 'GLOBAL',
        scopeKey: 'GLOBAL',
        mode,
        config: {},
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [finappSimScenario.scopeType, finappSimScenario.scopeKey],
        set: { mode, config: {}, updatedAt: new Date() },
      });
  }
}
