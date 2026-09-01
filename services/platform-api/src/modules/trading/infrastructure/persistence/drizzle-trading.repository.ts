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
import type {
  OrderRequest,
  OrderView,
  QuoteRequest,
  QuoteView,
} from '../../domain/trading-model.js';

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
  private readonly pool: Pool;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.pool = pool;
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

  async prepareOrder(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    request: OrderRequest,
  ): Promise<Awaited<ReturnType<TradingRepository['prepareOrder']>>> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`${userId}:CREATE_ORDER:${idempotencyKey}`],
      );
      const existing = await client.query<{
        request_hash: string;
        response_snapshot: OrderView;
      }>(
        `
        SELECT request_hash, response_snapshot
        FROM finapp_trading.finapp_idempotency_record
        WHERE user_id = $1 AND operation = 'CREATE_ORDER' AND idempotency_key = $2
      `,
        [userId, idempotencyKey],
      );
      const recorded = existing.rows[0];
      if (recorded !== undefined) {
        await client.query('COMMIT');
        return recorded.request_hash === requestHash
          ? {
              kind: 'prepared',
              value: { created: false, order: recorded.response_snapshot },
            }
          : { kind: 'idempotency_conflict' };
      }

      const quotes = await client.query<{
        available_balance: string;
        cash_account_id: string;
        currency: string;
        estimated_amount: string;
        expires_at: Date;
        fee: string;
      }>(
        `
        SELECT
          c.id AS cash_account_id,
          c.available_balance::text AS available_balance,
          q.estimated_amount::text AS estimated_amount,
          q.fee::text AS fee,
          q.currency,
          q.expires_at
        FROM finapp_trading.finapp_quote q
        JOIN finapp_wealth.finapp_cash_account c
          ON c.account_id = q.account_id AND c.user_id = q.user_id
        WHERE q.id = $1
          AND q.user_id = $2
          AND q.account_id = $3
          AND q.instrument_id = $4
          AND q.side = $5
          AND q.quantity = $6::numeric
        FOR UPDATE OF c
      `,
        [
          request.quoteId,
          userId,
          request.accountId,
          request.instrumentId,
          request.side,
          request.quantity,
        ],
      );
      const quote = quotes.rows[0];
      if (quote === undefined) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }
      if (quote.expires_at.getTime() <= Date.now()) {
        await client.query('ROLLBACK');
        return { kind: 'quote_expired' };
      }
      const reservationAmount =
        scaled(quote.estimated_amount, 4) + scaled(quote.fee, 4);
      if (scaled(quote.available_balance, 4) < reservationAmount) {
        await client.query('ROLLBACK');
        return { kind: 'insufficient_funds' };
      }

      const orderId = randomUUID();
      const reservationId = randomUUID();
      const createdAt = new Date();
      const reservationExpiresAt = new Date(createdAt.getTime() + 15 * 60_000);
      const idempotencyExpiresAt = new Date(
        createdAt.getTime() + 24 * 60 * 60_000,
      );
      const amount = format(reservationAmount, 4);
      const order: OrderView = {
        orderId,
        status: 'PENDING_SUBMISSION',
        side: 'BUY',
        quantity: request.quantity,
        estimatedAmount: quote.estimated_amount,
        filledAmount: null,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        statusRefreshRecommendedAfterMs: 2000,
      };
      await client.query(
        `
        INSERT INTO finapp_trading.finapp_trade_order (
          id, user_id, account_id, instrument_id, quote_id, client_order_id,
          side, quantity, estimated_amount, currency, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING_SUBMISSION',$11,$11)
      `,
        [
          orderId,
          userId,
          request.accountId,
          request.instrumentId,
          request.quoteId,
          orderId,
          request.side,
          request.quantity,
          quote.estimated_amount,
          quote.currency,
          createdAt,
        ],
      );
      await client.query(
        `
        INSERT INTO finapp_trading.finapp_fund_reservation (
          id, order_id, cash_account_id, amount, status, expires_at, created_at
        ) VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6)
      `,
        [
          reservationId,
          orderId,
          quote.cash_account_id,
          amount,
          reservationExpiresAt,
          createdAt,
        ],
      );
      await client.query(
        `
        UPDATE finapp_wealth.finapp_cash_account
        SET available_balance = available_balance - $1::numeric,
            reserved_balance = reserved_balance + $1::numeric,
            version = version + 1,
            updated_at = $2
        WHERE id = $3
      `,
        [amount, createdAt, quote.cash_account_id],
      );
      await client.query(
        `
        INSERT INTO finapp_trading.finapp_idempotency_record (
          id, user_id, operation, idempotency_key, request_hash,
          resource_type, resource_id, response_status, response_snapshot,
          created_at, expires_at
        ) VALUES ($1,$2,'CREATE_ORDER',$3,$4,'TRADE_ORDER',$5,202,$6::jsonb,$7,$8)
      `,
        [
          randomUUID(),
          userId,
          idempotencyKey,
          requestHash,
          orderId,
          JSON.stringify(order),
          createdAt,
          idempotencyExpiresAt,
        ],
      );
      await client.query('COMMIT');
      return { kind: 'prepared', value: { created: true, order } };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        const existing = await this.pool.query<{
          request_hash: string;
          response_snapshot: OrderView;
        }>(
          `
          SELECT request_hash, response_snapshot
          FROM finapp_trading.finapp_idempotency_record
          WHERE user_id = $1 AND operation = 'CREATE_ORDER' AND idempotency_key = $2
        `,
          [userId, idempotencyKey],
        );
        const recorded = existing.rows[0];
        if (recorded !== undefined) {
          return recorded.request_hash === requestHash
            ? {
                kind: 'prepared',
                value: { created: false, order: recorded.response_snapshot },
              }
            : { kind: 'idempotency_conflict' };
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
