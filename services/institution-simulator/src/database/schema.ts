import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
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
