import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';

import { SIMULATOR_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import type { ScenarioMode } from '../../../scenario/domain/scenario-mode.js';
import type { BrokerageRepository } from '../../application/ports/brokerage-repository.port.js';
import type {
  BrokerageOrderRequest,
  BrokerageOrderStatus,
  BrokerageOrderView,
} from '../../domain/brokerage-order.js';

interface OrderRow {
  readonly client_order_id: string;
  readonly external_order_id: string;
  readonly filled_at: Date | null;
  readonly quantity: string;
  readonly request_hash: string;
  readonly scenario_mode: ScenarioMode;
  readonly side: 'BUY';
  readonly status: BrokerageOrderStatus;
  readonly unit_price: string | null;
}

function scaled(value: string, scale: number): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, '0').slice(0, scale) || '0')
  );
}

function money(value: bigint): string {
  return `${value / 10_000n}.${(value % 10_000n).toString().padStart(4, '0')}`;
}

function view(row: OrderRow): BrokerageOrderView {
  const filledAmount =
    row.status === 'FILLED' && row.unit_price !== null
      ? money(
          (scaled(row.quantity, 8) * scaled(row.unit_price, 4)) / 100_000_000n,
        )
      : null;
  return {
    clientOrderId: row.client_order_id,
    externalOrderId: row.external_order_id,
    status: row.status,
    side: row.side,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    filledAmount,
    executedAt: row.filled_at?.toISOString() ?? null,
  };
}

@Injectable()
export class PostgresBrokerageRepository implements BrokerageRepository {
  constructor(@Inject(SIMULATOR_DATABASE_POOL) private readonly pool: Pool) {}

  async find(clientOrderId: string): Promise<BrokerageOrderView | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`SIMULATOR_ORDER:${clientOrderId}`],
      );
      const found = await client.query<OrderRow>(
        `SELECT client_order_id, external_order_id, request_hash, side,
                quantity::text, unit_price::text, status, scenario_mode, filled_at
         FROM finapp_simulator.finapp_sim_order
         WHERE client_order_id = $1
         FOR UPDATE`,
        [clientOrderId],
      );
      let row = found.rows[0];
      if (
        row !== undefined &&
        row.status === 'UNKNOWN' &&
        row.scenario_mode === 'ORDER_UNKNOWN_THEN_FILLED'
      ) {
        const filledAt = new Date();
        const updated = await client.query<OrderRow>(
          `UPDATE finapp_simulator.finapp_sim_order
           SET status = 'FILLED', filled_at = $2, updated_at = $2
           WHERE client_order_id = $1
           RETURNING client_order_id, external_order_id, request_hash, side,
                     quantity::text, unit_price::text, status, scenario_mode, filled_at`,
          [clientOrderId, filledAt],
        );
        row = updated.rows[0];
      }
      await client.query('COMMIT');
      return row === undefined ? undefined : view(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async submit(
    request: BrokerageOrderRequest,
    requestHash: string,
    scenarioMode: ScenarioMode,
  ): Promise<Awaited<ReturnType<BrokerageRepository['submit']>>> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`SIMULATOR_ORDER:${request.clientOrderId}`],
      );
      const existing = await client.query<OrderRow>(
        `SELECT client_order_id, external_order_id, request_hash, side,
                quantity::text, unit_price::text, status, scenario_mode, filled_at
         FROM finapp_simulator.finapp_sim_order
         WHERE client_order_id = $1`,
        [request.clientOrderId],
      );
      const recorded = existing.rows[0];
      if (recorded !== undefined) {
        await client.query('COMMIT');
        return recorded.request_hash === requestHash
          ? { kind: 'accepted', created: false, order: view(recorded) }
          : { kind: 'conflict' };
      }

      const source = await client.query<{
        account_id: string;
        instrument_id: string;
        price: string;
      }>(
        `SELECT a.id AS account_id, i.id AS instrument_id, p.price::text
         FROM finapp_simulator.finapp_sim_account a
         JOIN finapp_simulator.finapp_sim_instrument i
           ON i.instrument_code = $2 AND i.status = 'ACTIVE'
         JOIN LATERAL (
           SELECT price
           FROM finapp_simulator.finapp_sim_market_price
           WHERE instrument_id = i.id
           ORDER BY as_of_at DESC
           LIMIT 1
         ) p ON true
         WHERE a.external_account_id = $1 AND a.status = 'ACTIVE'
         LIMIT 1`,
        [request.accountId, request.instrumentId],
      );
      const matched = source.rows[0];
      if (matched === undefined) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const status: BrokerageOrderStatus =
        scenarioMode === 'ORDER_REJECT'
          ? 'REJECTED'
          : scenarioMode === 'ORDER_UNKNOWN_THEN_FILLED'
            ? 'UNKNOWN'
            : 'FILLED';
      const now = new Date();
      const externalOrderId = `SIM-${request.clientOrderId}`;
      const inserted = await client.query<OrderRow>(
        `INSERT INTO finapp_simulator.finapp_sim_order (
           id, client_order_id, external_order_id, request_hash, account_id,
           instrument_id, side, quantity, unit_price, status, scenario_mode,
           created_at, updated_at, filled_at
         ) VALUES ($1,$1,$2,$3,$4,$5,'BUY',$6,$7,$8,$9,$10,$10,$11)
         RETURNING client_order_id, external_order_id, request_hash, side,
                   quantity::text, unit_price::text, status, scenario_mode, filled_at`,
        [
          request.clientOrderId,
          externalOrderId,
          requestHash,
          matched.account_id,
          matched.instrument_id,
          request.quantity,
          matched.price,
          status,
          scenarioMode,
          now,
          status === 'FILLED' ? now : null,
        ],
      );
      await client.query('COMMIT');
      const row = inserted.rows[0];
      if (row === undefined) throw new Error('Simulator order insert failed.');
      return { kind: 'accepted', created: true, order: view(row) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
