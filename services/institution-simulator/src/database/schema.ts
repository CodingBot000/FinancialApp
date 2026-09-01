import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const finappMetaSchema = pgSchema('finapp_meta');
export const finappSimulatorSchema = pgSchema('finapp_simulator');

export const finappSimCustomer = finappSimulatorSchema.table(
  'finapp_sim_customer',
  {
    id: uuid('id').notNull(),
    externalCustomerId: varchar('external_customer_id', {
      length: 100,
    }).notNull(),
    preset: varchar('preset', { length: 40 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    seed: bigint('seed', { mode: 'bigint' }).notNull(),
    datasetVersion: varchar('dataset_version', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_customer', columns: [table.id] }),
    unique('finapp_uq_sim_customer_external').on(table.externalCustomerId),
  ],
);

export const finappSimAccount = finappSimulatorSchema.table(
  'finapp_sim_account',
  {
    id: uuid('id').notNull(),
    customerId: uuid('customer_id').notNull(),
    externalAccountId: varchar('external_account_id', {
      length: 100,
    }).notNull(),
    maskedAccountNumber: varchar('masked_account_number', {
      length: 100,
    }).notNull(),
    accountType: varchar('account_type', { length: 30 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    cashBalance: numeric('cash_balance', { precision: 19, scale: 4 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_account', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_sim_account_customer',
      columns: [table.customerId],
      foreignColumns: [finappSimCustomer.id],
    }).onDelete('restrict'),
    unique('finapp_uq_sim_account_customer_external').on(
      table.customerId,
      table.externalAccountId,
    ),
    check('finapp_ck_sim_account_cash', sql`${table.cashBalance} >= 0`),
  ],
);

export const finappSimInstrument = finappSimulatorSchema.table(
  'finapp_sim_instrument',
  {
    id: uuid('id').notNull(),
    instrumentCode: varchar('instrument_code', { length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 150 }).notNull(),
    assetClass: varchar('asset_class', { length: 30 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_instrument', columns: [table.id] }),
    unique('finapp_uq_sim_instrument_code').on(table.instrumentCode),
  ],
);

export const finappSimHolding = finappSimulatorSchema.table(
  'finapp_sim_holding',
  {
    id: uuid('id').notNull(),
    accountId: uuid('account_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    externalHoldingId: varchar('external_holding_id', {
      length: 100,
    }).notNull(),
    quantity: numeric('quantity', { precision: 19, scale: 8 }).notNull(),
    averagePrice: numeric('average_price', {
      precision: 19,
      scale: 4,
    }).notNull(),
    asOfAt: timestamp('as_of_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_holding', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_sim_holding_account',
      columns: [table.accountId],
      foreignColumns: [finappSimAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_sim_holding_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappSimInstrument.id],
    }).onDelete('restrict'),
    unique('finapp_uq_sim_holding_account_instrument').on(
      table.accountId,
      table.instrumentId,
    ),
    check(
      'finapp_ck_sim_holding_values',
      sql`${table.quantity} >= 0 AND ${table.averagePrice} >= 0`,
    ),
  ],
);

export const finappSimTransaction = finappSimulatorSchema.table(
  'finapp_sim_transaction',
  {
    id: uuid('id').notNull(),
    accountId: uuid('account_id').notNull(),
    externalTransactionId: varchar('external_transaction_id', {
      length: 100,
    }).notNull(),
    transactionType: varchar('transaction_type', { length: 30 }).notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_transaction', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_sim_transaction_account',
      columns: [table.accountId],
      foreignColumns: [finappSimAccount.id],
    }).onDelete('restrict'),
    unique('finapp_uq_sim_transaction_account_external').on(
      table.accountId,
      table.externalTransactionId,
    ),
    index('finapp_idx_sim_transaction_account_time').on(
      table.accountId,
      table.occurredAt,
    ),
  ],
);

export const finappSimMarketPrice = finappSimulatorSchema.table(
  'finapp_sim_market_price',
  {
    id: uuid('id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    price: numeric('price', { precision: 19, scale: 4 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    asOfAt: timestamp('as_of_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_market_price', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_sim_price_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappSimInstrument.id],
    }).onDelete('restrict'),
    unique('finapp_uq_sim_price_instrument_time').on(
      table.instrumentId,
      table.asOfAt,
    ),
    index('finapp_idx_sim_price_instrument_time').on(
      table.instrumentId,
      table.asOfAt,
    ),
    check('finapp_ck_sim_market_price_positive', sql`${table.price} > 0`),
  ],
);

export const finappSimOrder = finappSimulatorSchema.table(
  'finapp_sim_order',
  {
    id: uuid('id').notNull(),
    clientOrderId: uuid('client_order_id').notNull(),
    externalOrderId: varchar('external_order_id', { length: 100 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    accountId: uuid('account_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    side: varchar('side', { length: 10 }).notNull().default('BUY'),
    quantity: numeric('quantity', { precision: 19, scale: 8 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 19, scale: 4 }),
    status: varchar('status', { length: 30 }).notNull(),
    scenarioMode: varchar('scenario_mode', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    filledAt: timestamp('filled_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_order', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_sim_order_account',
      columns: [table.accountId],
      foreignColumns: [finappSimAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_sim_order_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappSimInstrument.id],
    }).onDelete('restrict'),
    unique('finapp_uq_sim_order_client_id').on(table.clientOrderId),
    unique('finapp_uq_sim_order_external').on(table.externalOrderId),
    index('finapp_idx_sim_order_status_updated').on(
      table.status,
      table.updatedAt,
    ),
    check('finapp_ck_sim_order_side', sql`${table.side} = 'BUY'`),
    check(
      'finapp_ck_sim_order_quantity',
      sql`${table.quantity} > 0 AND (${table.unitPrice} IS NULL OR ${table.unitPrice} > 0)`,
    ),
    check(
      'finapp_ck_sim_order_status',
      sql`${table.status} IN ('FILLED', 'REJECTED', 'UNKNOWN')`,
    ),
  ],
);

export const finappSimScenario = finappSimulatorSchema.table(
  'finapp_sim_scenario',
  {
    id: uuid('id').notNull(),
    scopeType: varchar('scope_type', { length: 30 }).notNull(),
    scopeKey: varchar('scope_key', { length: 100 }).notNull(),
    mode: varchar('mode', { length: 50 }).notNull(),
    config: jsonb('config').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sim_scenario', columns: [table.id] }),
    unique('finapp_uq_sim_scenario_scope').on(table.scopeType, table.scopeKey),
    check(
      'finapp_ck_sim_scenario_mode',
      sql`${table.mode} IN ('NORMAL', 'TIMEOUT', 'HTTP_500', 'MALFORMED_RESPONSE', 'ORDER_REJECT', 'ORDER_UNKNOWN_THEN_FILLED')`,
    ),
  ],
);
