import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappAuditEvent,
  finappCashAccount,
  finappCashLedgerEntry,
  finappFinancialAccount,
  finappHolding,
  finappInstrument,
  finappOrderExecution,
  finappOutboxDelivery,
  finappOutboxEvent,
  finappPosition,
  finappQuote,
  finappReconciliationJob,
  finappTradeOrder,
} from '../../../../database/schema.js';
import type { TradingRepository } from '../../application/ports/trading-repository.port.js';
import type {
  ExternalOrderRequest,
  ExternalOrderResult,
  OrderRequest,
  OrderPage,
  OrderView,
  OutboxClaim,
  QuoteRequest,
  QuoteView,
  ReconciliationClaim,
} from '../../domain/trading-model.js';

const schema = {
  finappAuditEvent,
  finappCashAccount,
  finappCashLedgerEntry,
  finappFinancialAccount,
  finappHolding,
  finappInstrument,
  finappOrderExecution,
  finappOutboxDelivery,
  finappOutboxEvent,
  finappPosition,
  finappQuote,
  finappReconciliationJob,
  finappTradeOrder,
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

interface OrderRow {
  readonly id: string;
  readonly status: OrderView['status'];
  readonly quantity: string;
  readonly estimated_amount: string;
  readonly filled_amount: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

function orderView(row: OrderRow): OrderView {
  return {
    orderId: row.id,
    status: row.status,
    side: 'BUY',
    quantity: row.quantity,
    estimatedAmount: row.estimated_amount,
    filledAmount: row.filled_amount,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    statusRefreshRecommendedAfterMs:
      row.status === 'PENDING_SUBMISSION' || row.status === 'UNKNOWN'
        ? 2000
        : null,
  };
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
    unitPrice: string,
  ): Promise<QuoteView | undefined> {
    const prices = await this.database
      .select({
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
    if (price === undefined || scaled(unitPrice, 4) <= 0n) {
      return undefined;
    }
    const quantity = scaled(request.quantity, 8);
    const amount = (quantity * scaled(unitPrice, 4)) / 100_000_000n;
    if (amount <= 0n || amount > 9_999_999_999_999_999_999n) {
      return undefined;
    }
    const quoteId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 60_000);
    const normalizedQuantity = format(quantity, 8);
    const normalizedPrice = format(scaled(unitPrice, 4), 4);
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

  async quoteInstrument(
    userId: string,
    request: QuoteRequest,
  ): Promise<string | undefined> {
    const rows = await this.database
      .select({ instrumentCode: finappInstrument.instrumentCode })
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
    return rows[0]?.instrumentCode;
  }

  async prepareOrder(
    userId: string,
    idempotencyKey: string,
    requestHash: string,
    request: OrderRequest,
    traceId = 'unavailable',
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
      const cash = await client.query<{ available_balance: string }>(
        `
        UPDATE finapp_wealth.finapp_cash_account
        SET available_balance = available_balance - $1::numeric,
            reserved_balance = reserved_balance + $1::numeric,
            version = version + 1,
            updated_at = $2
        WHERE id = $3
        RETURNING available_balance::text
      `,
        [amount, createdAt, quote.cash_account_id],
      );
      await client.query(
        `
        INSERT INTO finapp_trading.finapp_cash_ledger_entry (
          id, cash_account_id, order_id, entry_type, amount, balance_after, occurred_at
        ) VALUES ($1,$2,$3,'RESERVE',$4,$5,$6)
      `,
        [
          randomUUID(),
          quote.cash_account_id,
          orderId,
          `-${amount}`,
          cash.rows[0]?.available_balance ?? '0.0000',
          createdAt,
        ],
      );
      await client.query(
        `
        INSERT INTO finapp_audit.finapp_audit_event (
          id, occurred_at, user_id, action, resource_type, resource_id,
          result, trace_id, metadata
        ) VALUES ($1,$2,$3,'ORDER_CREATED','TRADE_ORDER',$4,'SUCCESS',$5,$6::jsonb)
      `,
        [
          randomUUID(),
          createdAt,
          userId,
          orderId,
          traceId.slice(0, 100),
          JSON.stringify({ side: 'BUY', syntheticData: true }),
        ],
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

  async submission(
    userId: string,
    orderId: string,
  ): Promise<ExternalOrderRequest | undefined> {
    const rows = await this.pool.query<{
      account_id: string;
      client_order_id: string;
      instrument_id: string;
      order_id: string;
      quantity: string;
      user_id: string;
    }>(
      `
      SELECT o.id AS order_id, o.user_id, o.client_order_id,
             'SYNTH-ACCOUNT-A-001'::text AS account_id,
             i.instrument_code AS instrument_id, o.quantity::text
      FROM finapp_trading.finapp_trade_order o
      JOIN finapp_wealth.finapp_instrument i ON i.id = o.instrument_id
      WHERE o.id = $1 AND o.user_id = $2 AND o.status = 'PENDING_SUBMISSION'
    `,
      [orderId, userId],
    );
    const row = rows.rows[0];
    return row === undefined
      ? undefined
      : {
          orderId: row.order_id,
          userId: row.user_id,
          clientOrderId: row.client_order_id,
          accountId: row.account_id,
          instrumentId: row.instrument_id,
          quantity: row.quantity,
        };
  }

  async findOrder(
    userId: string,
    orderId: string,
  ): Promise<OrderView | undefined> {
    const result = await this.pool.query<OrderRow>(
      `
      SELECT o.id, o.status, o.quantity::text, o.estimated_amount::text,
             e.amount::text AS filled_amount, o.created_at, o.updated_at
      FROM finapp_trading.finapp_trade_order o
      LEFT JOIN finapp_trading.finapp_order_execution e ON e.order_id = o.id
      WHERE o.id = $1 AND o.user_id = $2
    `,
      [orderId, userId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : orderView(row);
  }

  async listOrders(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<OrderPage> {
    const result = await this.pool.query<OrderRow>(
      `
      SELECT o.id, o.status, o.quantity::text, o.estimated_amount::text,
             e.amount::text AS filled_amount, o.created_at, o.updated_at
      FROM finapp_trading.finapp_trade_order o
      LEFT JOIN finapp_trading.finapp_order_execution e ON e.order_id = o.id
      WHERE o.user_id = $1
        AND ($2::uuid IS NULL OR (o.created_at, o.id) < (
          SELECT created_at, id FROM finapp_trading.finapp_trade_order
          WHERE id = $2::uuid AND user_id = $1
        ))
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $3
    `,
      [userId, cursor ?? null, limit + 1],
    );
    const hasNext = result.rows.length > limit;
    const rows = result.rows.slice(0, limit);
    return {
      items: rows.map(orderView),
      nextCursor: hasNext ? (rows.at(-1)?.id ?? null) : null,
    };
  }

  async markUnknown(
    orderId: string,
    reasonCode: string,
    traceId: string,
  ): Promise<OrderView> {
    const now = new Date();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const changed = await client.query<{ user_id: string }>(
        `
        UPDATE finapp_trading.finapp_trade_order
        SET status = 'UNKNOWN', version = version + 1, updated_at = $2
        WHERE id = $1 AND status IN ('PENDING_SUBMISSION', 'UNKNOWN')
        RETURNING user_id
      `,
        [orderId, now],
      );
      const userId = changed.rows[0]?.user_id;
      if (userId !== undefined) {
        await client.query(
          `
          INSERT INTO finapp_trading.finapp_reconciliation_job (
            id, order_id, status, attempt, next_attempt_at, created_at
          ) VALUES ($1,$2,'QUEUED',0,$3,$3)
          ON CONFLICT DO NOTHING
        `,
          [randomUUID(), orderId, now],
        );
        await this.insertAudit(client, {
          userId,
          action: 'ORDER_SUBMITTED',
          orderId,
          result: 'UNKNOWN',
          reasonCode,
          traceId,
          now,
        });
      }
      await client.query('COMMIT');
      const view = await this.findOrderById(orderId);
      if (view === undefined) throw new Error('Order was not found.');
      return view;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async applyExternalResult(
    orderId: string,
    result: ExternalOrderResult,
    source: 'SUBMISSION' | 'RECONCILIATION',
    traceId: string,
    reconciliationJobId?: string,
  ): Promise<OrderView> {
    if (result.status === 'UNKNOWN') {
      return this.markUnknown(orderId, 'ORDER_UNKNOWN', traceId);
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`ORDER_SETTLEMENT:${orderId}`],
      );
      const locked = await client.query<{
        account_id: string;
        cash_account_id: string;
        estimated_amount: string;
        instrument_id: string;
        quantity: string;
        reservation_amount: string;
        status: string;
        user_id: string;
      }>(
        `
        SELECT o.user_id, o.account_id, o.instrument_id, o.quantity::text,
               o.estimated_amount::text, o.status, r.cash_account_id,
               r.amount::text AS reservation_amount
        FROM finapp_trading.finapp_trade_order o
        JOIN finapp_trading.finapp_fund_reservation r ON r.order_id = o.id
        JOIN finapp_wealth.finapp_cash_account c ON c.id = r.cash_account_id
        WHERE o.id = $1
        FOR UPDATE OF o, r, c
      `,
        [orderId],
      );
      const order = locked.rows[0];
      if (order === undefined) throw new Error('Order was not found.');
      const now = new Date();
      if (!['FILLED', 'REJECTED', 'FAILED'].includes(order.status)) {
        if (result.status === 'FILLED') {
          if (
            result.unitPrice === null ||
            result.filledAmount === null ||
            result.executedAt === null ||
            result.quantity !== order.quantity ||
            (scaled(result.quantity, 8) * scaled(result.unitPrice, 4)) /
              100_000_000n !==
              scaled(result.filledAmount, 4) ||
            scaled(result.filledAmount, 4) > scaled(order.reservation_amount, 4)
          ) {
            throw new Error(
              'External fill exceeds the reservation or is incomplete.',
            );
          }
          const refund =
            scaled(order.reservation_amount, 4) -
            scaled(result.filledAmount, 4);
          const cash = await client.query<{ available_balance: string }>(
            `
            UPDATE finapp_wealth.finapp_cash_account
            SET available_balance = available_balance + $1::numeric,
                reserved_balance = reserved_balance - $2::numeric,
                version = version + 1, updated_at = $3
            WHERE id = $4
            RETURNING available_balance::text
          `,
            [
              format(refund, 4),
              order.reservation_amount,
              now,
              order.cash_account_id,
            ],
          );
          await client.query(
            `
            UPDATE finapp_trading.finapp_fund_reservation
            SET status = 'SETTLED', settled_at = $2
            WHERE order_id = $1 AND status = 'ACTIVE'
          `,
            [orderId, now],
          );
          await client.query(
            `
            INSERT INTO finapp_trading.finapp_order_execution (
              id, order_id, external_execution_id, quantity, unit_price,
              amount, executed_at, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (order_id) DO NOTHING
          `,
            [
              randomUUID(),
              orderId,
              `${result.externalOrderId}-EXEC`,
              result.quantity,
              result.unitPrice,
              result.filledAmount,
              new Date(result.executedAt),
              now,
            ],
          );
          await client.query(
            `
            INSERT INTO finapp_trading.finapp_position (
              id, user_id, account_id, instrument_id, quantity,
              average_price, version, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,0,$7)
            ON CONFLICT (account_id, instrument_id) DO UPDATE SET
              average_price = (
                finapp_position.quantity * finapp_position.average_price + EXCLUDED.quantity * EXCLUDED.average_price
              ) / (finapp_position.quantity + EXCLUDED.quantity),
              quantity = finapp_position.quantity + EXCLUDED.quantity,
              version = finapp_position.version + 1,
              updated_at = EXCLUDED.updated_at
          `,
            [
              randomUUID(),
              order.user_id,
              order.account_id,
              order.instrument_id,
              result.quantity,
              result.unitPrice,
              now,
            ],
          );
          await client.query(
            `
            INSERT INTO finapp_trading.finapp_cash_ledger_entry (
              id, cash_account_id, order_id, entry_type, amount,
              balance_after, occurred_at
            ) VALUES ($1,$2,$3,'SETTLE',$4,$5,$6)
            ON CONFLICT (order_id, entry_type) DO NOTHING
          `,
            [
              randomUUID(),
              order.cash_account_id,
              orderId,
              `-${result.filledAmount}`,
              cash.rows[0]?.available_balance ?? '0.0000',
              now,
            ],
          );
        } else {
          const cash = await client.query<{ available_balance: string }>(
            `
            UPDATE finapp_wealth.finapp_cash_account
            SET available_balance = available_balance + $1::numeric,
                reserved_balance = reserved_balance - $1::numeric,
                version = version + 1, updated_at = $2
            WHERE id = $3
            RETURNING available_balance::text
          `,
            [order.reservation_amount, now, order.cash_account_id],
          );
          await client.query(
            `
            UPDATE finapp_trading.finapp_fund_reservation
            SET status = 'RELEASED', released_at = $2
            WHERE order_id = $1 AND status = 'ACTIVE'
          `,
            [orderId, now],
          );
          await client.query(
            `
            INSERT INTO finapp_trading.finapp_cash_ledger_entry (
              id, cash_account_id, order_id, entry_type, amount,
              balance_after, occurred_at
            ) VALUES ($1,$2,$3,'RELEASE',$4,$5,$6)
            ON CONFLICT (order_id, entry_type) DO NOTHING
          `,
            [
              randomUUID(),
              order.cash_account_id,
              orderId,
              order.reservation_amount,
              cash.rows[0]?.available_balance ?? '0.0000',
              now,
            ],
          );
        }
        await client.query(
          `
          UPDATE finapp_trading.finapp_trade_order
          SET status = $2, external_order_id = $3,
              version = version + 1, updated_at = $4
          WHERE id = $1
        `,
          [orderId, result.status, result.externalOrderId, now],
        );
        await this.insertAudit(client, {
          userId: order.user_id,
          action: 'ORDER_SUBMITTED',
          orderId,
          result: result.status === 'FILLED' ? 'SUCCESS' : 'FAILURE',
          ...(result.status === 'REJECTED'
            ? { reasonCode: 'ORDER_EXTERNAL_REJECTED' }
            : {}),
          traceId,
          now,
        });
        if (source === 'RECONCILIATION') {
          await this.insertAudit(client, {
            userId: order.user_id,
            action: 'ORDER_RECONCILED',
            orderId,
            result: result.status === 'FILLED' ? 'SUCCESS' : 'FAILURE',
            traceId,
            now,
          });
        }
        if (result.status === 'FILLED') {
          await this.insertAudit(client, {
            userId: order.user_id,
            action: 'ORDER_FILLED',
            orderId,
            result: 'SUCCESS',
            traceId,
            now,
          });
        }
        await this.insertSettlementOutbox(client, orderId, result.status, now);
      }
      if (reconciliationJobId !== undefined) {
        await client.query(
          `
          UPDATE finapp_trading.finapp_reconciliation_job
          SET status = 'COMPLETED', locked_at = NULL, locked_by = NULL,
              completed_at = $2
          WHERE id = $1 AND status = 'PROCESSING'
        `,
          [reconciliationJobId, now],
        );
      }
      await client.query('COMMIT');
      const view = await this.findOrderById(orderId);
      if (view === undefined) throw new Error('Settled order was not found.');
      return view;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async claimReconciliation(
    workerId: string,
    now: Date,
    staleBefore: Date,
  ): Promise<ReconciliationClaim | undefined> {
    await this.pool.query(
      `
      UPDATE finapp_trading.finapp_reconciliation_job
      SET status = 'QUEUED', locked_at = NULL, locked_by = NULL,
          last_error_code = 'RECONCILIATION_LEASE_EXPIRED'
      WHERE status = 'PROCESSING' AND locked_at < $1
    `,
      [staleBefore],
    );
    const result = await this.pool.query<{
      attempt: number;
      client_order_id: string;
      job_id: string;
      order_id: string;
      quantity: string;
    }>(
      `
      WITH candidate AS (
        SELECT id FROM finapp_trading.finapp_reconciliation_job
        WHERE status = 'QUEUED' AND next_attempt_at <= $1
        ORDER BY next_attempt_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE finapp_trading.finapp_reconciliation_job j
      SET status = 'PROCESSING', attempt = attempt + 1,
          locked_at = $1, locked_by = $2
      FROM candidate c, finapp_trading.finapp_trade_order o
      WHERE j.id = c.id AND o.id = j.order_id
      RETURNING j.id AS job_id, j.order_id, j.attempt,
                o.client_order_id, o.quantity::text
    `,
      [now, workerId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : {
          jobId: row.job_id,
          orderId: row.order_id,
          clientOrderId: row.client_order_id,
          quantity: row.quantity,
          attempt: row.attempt,
        };
  }

  async rescheduleReconciliation(
    claim: ReconciliationClaim,
    reasonCode: string,
    retryAt: Date,
    maxAttempts: number,
  ): Promise<void> {
    const failed = claim.attempt >= maxAttempts;
    if (!failed) {
      await this.pool.query(
        `
        UPDATE finapp_trading.finapp_reconciliation_job
        SET status = 'QUEUED', next_attempt_at = $2, last_error_code = $3,
            locked_at = NULL, locked_by = NULL
        WHERE id = $1 AND status = 'PROCESSING'
      `,
        [claim.jobId, retryAt, reasonCode],
      );
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query<{
        amount: string;
        available_balance: string;
        cash_account_id: string;
        user_id: string;
      }>(
        `
        SELECT r.amount::text, r.cash_account_id, o.user_id,
               c.available_balance::text
        FROM finapp_trading.finapp_reconciliation_job j
        JOIN finapp_trading.finapp_trade_order o ON o.id = j.order_id
        JOIN finapp_trading.finapp_fund_reservation r ON r.order_id = o.id
        JOIN finapp_wealth.finapp_cash_account c ON c.id = r.cash_account_id
        WHERE j.id = $1 AND j.status = 'PROCESSING'
        FOR UPDATE OF j, o, r, c
      `,
        [claim.jobId],
      );
      const row = locked.rows[0];
      if (row !== undefined) {
        const cash = await client.query<{ available_balance: string }>(
          `
          UPDATE finapp_wealth.finapp_cash_account
          SET available_balance = available_balance + $1::numeric,
              reserved_balance = reserved_balance - $1::numeric,
              version = version + 1, updated_at = now()
          WHERE id = $2
          RETURNING available_balance::text
        `,
          [row.amount, row.cash_account_id],
        );
        await client.query(
          `
          UPDATE finapp_trading.finapp_fund_reservation
          SET status = 'RELEASED', released_at = now()
          WHERE order_id = $1 AND status = 'ACTIVE'
        `,
          [claim.orderId],
        );
        await client.query(
          `
          INSERT INTO finapp_trading.finapp_cash_ledger_entry (
            id, cash_account_id, order_id, entry_type, amount,
            balance_after, occurred_at
          ) VALUES ($1,$2,$3,'RELEASE',$4,$5,now())
          ON CONFLICT (order_id, entry_type) DO NOTHING
        `,
          [
            randomUUID(),
            row.cash_account_id,
            claim.orderId,
            row.amount,
            cash.rows[0]?.available_balance ?? row.available_balance,
          ],
        );
        await client.query(
          `
          UPDATE finapp_trading.finapp_trade_order
          SET status = 'FAILED', version = version + 1, updated_at = now()
          WHERE id = $1 AND status = 'UNKNOWN'
        `,
          [claim.orderId],
        );
        await client.query(
          `
          UPDATE finapp_trading.finapp_reconciliation_job
          SET status = 'FAILED', next_attempt_at = $2,
              last_error_code = $3, locked_at = NULL, locked_by = NULL,
              completed_at = now()
          WHERE id = $1
        `,
          [claim.jobId, retryAt, reasonCode],
        );
        await this.insertAudit(client, {
          userId: row.user_id,
          action: 'ORDER_RECONCILED',
          orderId: claim.orderId,
          result: 'FAILURE',
          reasonCode,
          traceId: `reconciliation:${claim.jobId}`,
          now: new Date(),
        });
        await this.insertSettlementOutbox(
          client,
          claim.orderId,
          'FAILED',
          new Date(),
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async claimOutbox(
    workerId: string,
    now: Date,
    staleBefore: Date,
  ): Promise<OutboxClaim | undefined> {
    await this.pool.query(
      `
      UPDATE finapp_trading.finapp_outbox_event
      SET status = 'PENDING', locked_at = NULL, locked_by = NULL,
          last_error_code = 'OUTBOX_LEASE_EXPIRED'
      WHERE status = 'PROCESSING' AND locked_at < $1
    `,
      [staleBefore],
    );
    const result = await this.pool.query<{
      aggregate_id: string;
      aggregate_type: 'TRADE_ORDER';
      attempt: number;
      event_id: string;
      event_type: 'ORDER_SETTLED';
      payload: OutboxClaim['payload'];
    }>(
      `
      WITH candidate AS (
        SELECT id FROM finapp_trading.finapp_outbox_event
        WHERE status = 'PENDING' AND available_at <= $1
        ORDER BY available_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE finapp_trading.finapp_outbox_event e
      SET status = 'PROCESSING', attempt = attempt + 1,
          locked_at = $1, locked_by = $2
      FROM candidate c
      WHERE e.id = c.id
      RETURNING e.id AS event_id, e.aggregate_type, e.aggregate_id,
                e.event_type, e.payload, e.attempt
    `,
      [now, workerId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : {
          eventId: row.event_id,
          aggregateType: row.aggregate_type,
          aggregateId: row.aggregate_id,
          eventType: row.event_type,
          payload: row.payload,
          attempt: row.attempt,
          workerId,
        };
  }

  async recordOutboxDelivery(
    claim: OutboxClaim,
    consumerName: string,
  ): Promise<'DELIVERED' | 'DUPLICATE'> {
    const delivered = await this.pool.query(
      `
      INSERT INTO finapp_trading.finapp_outbox_delivery (
        id, event_id, consumer_name, delivered_at
      )
      SELECT $1, e.id, $3, now()
      FROM finapp_trading.finapp_outbox_event e
      WHERE e.id = $2 AND e.status = 'PROCESSING' AND e.locked_by = $4
      ON CONFLICT (event_id, consumer_name) DO NOTHING
    `,
      [randomUUID(), claim.eventId, consumerName, claim.workerId],
    );
    if ((delivered.rowCount ?? 0) === 1) return 'DELIVERED';
    const ownership = await this.pool.query(
      `
      SELECT 1 FROM finapp_trading.finapp_outbox_event
      WHERE id = $1 AND status = 'PROCESSING' AND locked_by = $2
    `,
      [claim.eventId, claim.workerId],
    );
    if ((ownership.rowCount ?? 0) !== 1) {
      throw new Error('Outbox claim lease is no longer owned by this worker.');
    }
    return 'DUPLICATE';
  }

  async completeOutbox(claim: OutboxClaim, processedAt: Date): Promise<void> {
    const result = await this.pool.query(
      `
      UPDATE finapp_trading.finapp_outbox_event
      SET status = 'PROCESSED', processed_at = $3,
          locked_at = NULL, locked_by = NULL, last_error_code = NULL
      WHERE id = $1 AND status = 'PROCESSING' AND locked_by = $2
    `,
      [claim.eventId, claim.workerId, processedAt],
    );
    if ((result.rowCount ?? 0) !== 1) {
      throw new Error('Outbox claim could not be completed by this worker.');
    }
  }

  async rescheduleOutbox(
    claim: OutboxClaim,
    reasonCode: string,
    retryAt: Date,
    maxAttempts: number,
  ): Promise<void> {
    await this.pool.query(
      `
      UPDATE finapp_trading.finapp_outbox_event
      SET status = CASE WHEN attempt >= $4 THEN 'FAILED' ELSE 'PENDING' END,
          available_at = $3, last_error_code = $5,
          locked_at = NULL, locked_by = NULL
      WHERE id = $1 AND status = 'PROCESSING' AND locked_by = $2
    `,
      [
        claim.eventId,
        claim.workerId,
        retryAt,
        maxAttempts,
        reasonCode.slice(0, 80),
      ],
    );
  }

  private async findOrderById(orderId: string): Promise<OrderView | undefined> {
    const result = await this.pool.query<OrderRow>(
      `
      SELECT o.id, o.status, o.quantity::text, o.estimated_amount::text,
             e.amount::text AS filled_amount, o.created_at, o.updated_at
      FROM finapp_trading.finapp_trade_order o
      LEFT JOIN finapp_trading.finapp_order_execution e ON e.order_id = o.id
      WHERE o.id = $1
    `,
      [orderId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : orderView(row);
  }

  private async insertAudit(
    client: {
      query: (text: string, values?: readonly unknown[]) => Promise<unknown>;
    },
    event: {
      readonly userId: string;
      readonly action: string;
      readonly orderId: string;
      readonly result: 'SUCCESS' | 'FAILURE' | 'UNKNOWN';
      readonly reasonCode?: string;
      readonly traceId: string;
      readonly now: Date;
    },
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO finapp_audit.finapp_audit_event (
        id, occurred_at, user_id, action, resource_type, resource_id,
        result, reason_code, trace_id, metadata
      ) VALUES ($1,$2,$3,$4,'TRADE_ORDER',$5,$6,$7,$8,$9::jsonb)
    `,
      [
        randomUUID(),
        event.now,
        event.userId,
        event.action,
        event.orderId,
        event.result,
        event.reasonCode ?? null,
        event.traceId.slice(0, 100),
        JSON.stringify({ syntheticData: true }),
      ],
    );
  }

  private async insertSettlementOutbox(
    client: {
      query: (text: string, values?: readonly unknown[]) => Promise<unknown>;
    },
    orderId: string,
    outcome: 'FILLED' | 'REJECTED' | 'FAILED',
    now: Date,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO finapp_trading.finapp_outbox_event (
        id, aggregate_type, aggregate_id, event_type, payload,
        status, attempt, available_at, created_at
      ) VALUES ($1,'TRADE_ORDER',$2,'ORDER_SETTLED',$3::jsonb,'PENDING',0,$4,$4)
      ON CONFLICT (aggregate_type, aggregate_id, event_type) DO NOTHING
    `,
      [
        randomUUID(),
        orderId,
        JSON.stringify({ outcome, syntheticData: true }),
        now,
      ],
    );
  }
}
