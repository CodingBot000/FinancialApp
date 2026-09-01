import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappFinancialAccount,
  finappHolding,
  finappInstrument,
  finappQuote,
} from '../../../../database/schema.js';
import type { TradingRepository } from '../../application/ports/trading-repository.port.js';
import type { QuoteRequest, QuoteView } from '../../domain/trading-model.js';

const schema = {
  finappFinancialAccount,
  finappHolding,
  finappInstrument,
  finappQuote,
};

type Database = NodePgDatabase<typeof schema>;

function scaled(value: string, scale: number): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, '0').slice(0, scale) || '0')
  );
}

function format(value: bigint, scale: number): string {
  const divisor = 10n ** BigInt(scale);
  return `${value / divisor}.${(value % divisor).toString().padStart(scale, '0')}`;
}

@Injectable()
export class DrizzleTradingRepository implements TradingRepository {
  private readonly database: Database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool, { schema });
  }

  async createQuote(
    userId: string,
    request: QuoteRequest,
  ): Promise<QuoteView | undefined> {
    const prices = await this.database
      .select({
        unitPrice: finappHolding.averagePrice,
        currency: finappInstrument.currency,
      })
      .from(finappFinancialAccount)
      .innerJoin(
        finappHolding,
        and(
          eq(finappHolding.accountId, finappFinancialAccount.id),
          eq(finappHolding.instrumentId, request.instrumentId),
          eq(finappHolding.userId, userId),
        ),
      )
      .innerJoin(
        finappInstrument,
        eq(finappInstrument.id, finappHolding.instrumentId),
      )
      .where(
        and(
          eq(finappFinancialAccount.id, request.accountId),
          eq(finappFinancialAccount.userId, userId),
          eq(finappFinancialAccount.status, 'ACTIVE'),
          eq(finappInstrument.status, 'ACTIVE'),
          eq(finappInstrument.currency, 'KRW'),
        ),
      )
      .limit(1);
    const price = prices[0];
    if (price === undefined || scaled(price.unitPrice, 4) <= 0n) {
      return undefined;
    }
    const quantity = scaled(request.quantity, 8);
    const amount = (quantity * scaled(price.unitPrice, 4)) / 100_000_000n;
    if (amount <= 0n || amount > 9_999_999_999_999_999_999n) {
      return undefined;
    }
    const quoteId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 60_000);
    const normalizedQuantity = format(quantity, 8);
    const normalizedPrice = format(scaled(price.unitPrice, 4), 4);
    const estimatedAmount = format(amount, 4);
    await this.database.insert(finappQuote).values({
      id: quoteId,
      userId,
      accountId: request.accountId,
      instrumentId: request.instrumentId,
      side: 'BUY',
      quantity: normalizedQuantity,
      unitPrice: normalizedPrice,
      estimatedAmount,
      fee: '0.0000',
      currency: 'KRW',
      expiresAt,
      createdAt,
    });
    return {
      quoteId,
      side: 'BUY',
      quantity: normalizedQuantity,
      unitPrice: normalizedPrice,
      estimatedAmount,
      fee: '0.0000',
      currency: 'KRW',
      expiresAt: expiresAt.toISOString(),
      syntheticQuote: true,
    };
  }
}
