import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
});

export const finappMetaSchema = pgSchema('finapp_meta');
export const finappIdentitySchema = pgSchema('finapp_identity');
export const finappMyDataSchema = pgSchema('finapp_mydata');
export const finappWealthSchema = pgSchema('finapp_wealth');
export const finappSimulationSchema = pgSchema('finapp_simulation');
export const finappTradingSchema = pgSchema('finapp_trading');
export const finappAuditSchema = pgSchema('finapp_audit');
export const finappCryptoSchema = pgSchema('finapp_crypto');
export const finappMarketSchema = pgSchema('finapp_market');

export const finappAppUser = finappIdentitySchema.table(
  'finapp_app_user',
  {
    id: uuid('id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    datasetVersion: varchar('dataset_version', { length: 50 }).notNull(),
    syntheticData: boolean('synthetic_data').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_app_user', columns: [table.id] }),
    check(
      'finapp_ck_app_user_status',
      sql`${table.status} IN ('ACTIVE', 'DISABLED')`,
    ),
    check('finapp_ck_app_user_synthetic', sql`${table.syntheticData} = true`),
  ],
);

export const finappOidcIdentity = finappIdentitySchema.table(
  'finapp_oidc_identity',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    issuer: varchar('issuer', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_oidc_identity', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_oidc_identity_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    unique('finapp_uq_oidc_identity_issuer_subject').on(
      table.issuer,
      table.subject,
    ),
    index('finapp_idx_oidc_identity_user').on(table.userId),
  ],
);

export const finappRiskProfile = finappIdentitySchema.table(
  'finapp_risk_profile',
  {
    userId: uuid('user_id').notNull(),
    riskLevel: varchar('risk_level', { length: 20 })
      .notNull()
      .default('BALANCED'),
    investmentHorizonMonths: integer('investment_horizon_months')
      .notNull()
      .default(120),
    monthlyContribution: numeric('monthly_contribution', {
      precision: 19,
      scale: 4,
    })
      .notNull()
      .default('0'),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_risk_profile', columns: [table.userId] }),
    foreignKey({
      name: 'finapp_fk_risk_profile_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_risk_profile_level',
      sql`${table.riskLevel} IN ('CONSERVATIVE', 'BALANCED', 'GROWTH')`,
    ),
    check(
      'finapp_ck_risk_profile_values',
      sql`${table.investmentHorizonMonths} BETWEEN 1 AND 600 AND ${table.monthlyContribution} >= 0`,
    ),
  ],
);

export const finappInstitutionConnection = finappMyDataSchema.table(
  'finapp_institution_connection',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    institutionCode: varchar('institution_code', { length: 50 }).notNull(),
    externalCustomerIdHash: varchar('external_customer_id_hash', {
      length: 64,
    }).notNull(),
    externalCustomerIdCiphertext: bytea(
      'external_customer_id_ciphertext',
    ).notNull(),
    encryptionKeyVersion: varchar('encryption_key_version', {
      length: 32,
    }).notNull(),
    maskedExternalCustomerId: varchar('masked_external_customer_id', {
      length: 100,
    }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    consentExpiresAt: timestamp('consent_expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    lastSuccessfulSyncAt: timestamp('last_successful_sync_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_institution_connection',
      columns: [table.id],
    }),
    foreignKey({
      name: 'finapp_fk_connection_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_connection_status',
      sql`${table.status} IN ('ACTIVE', 'REVOKED', 'EXPIRED')`,
    ),
  ],
);

export const finappSyncJob = finappMyDataSchema.table(
  'finapp_sync_job',
  {
    id: uuid('id').notNull(),
    connectionId: uuid('connection_id').notNull(),
    status: varchar('status', { length: 24 }).notNull().default('QUEUED'),
    attempt: integer('attempt').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),
    lockedBy: varchar('locked_by', { length: 100 }),
    errorCode: varchar('error_code', { length: 80 }),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_sync_job', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_sync_job_connection',
      columns: [table.connectionId],
      foreignColumns: [finappInstitutionConnection.id],
    }).onDelete('restrict'),
    check('finapp_ck_sync_job_attempt', sql`${table.attempt} >= 0`),
    check(
      'finapp_ck_sync_job_status',
      sql`${table.status} IN ('QUEUED', 'FETCHING', 'RAW_STORED', 'NORMALIZING', 'COMPLETED', 'FAILED')`,
    ),
    index('finapp_idx_sync_job_claim').on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index('finapp_idx_sync_job_connection_created').on(
      table.connectionId,
      table.createdAt,
    ),
  ],
);

export const finappRawBatch = finappMyDataSchema.table(
  'finapp_raw_batch',
  {
    id: uuid('id').notNull(),
    syncJobId: uuid('sync_job_id').notNull(),
    resourceType: varchar('resource_type', { length: 30 }).notNull(),
    requestId: varchar('request_id', { length: 100 }).notNull(),
    schemaVersion: varchar('schema_version', { length: 30 }).notNull(),
    pageCursor: varchar('page_cursor', { length: 500 }),
    payloadChecksum: varchar('payload_checksum', { length: 64 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_raw_batch', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_raw_batch_sync_job',
      columns: [table.syncJobId],
      foreignColumns: [finappSyncJob.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_raw_batch_resource_type',
      sql`${table.resourceType} IN ('ACCOUNT', 'HOLDING', 'TRANSACTION')`,
    ),
    index('finapp_idx_raw_batch_sync').on(table.syncJobId),
    index('finapp_idx_raw_batch_checksum').on(table.payloadChecksum),
  ],
);

export const finappRawRecord = finappMyDataSchema.table(
  'finapp_raw_record',
  {
    id: uuid('id').notNull(),
    rawBatchId: uuid('raw_batch_id').notNull(),
    resourceType: varchar('resource_type', { length: 30 }).notNull(),
    externalResourceId: varchar('external_resource_id', {
      length: 200,
    }).notNull(),
    payload: jsonb('payload').notNull(),
    payloadChecksum: varchar('payload_checksum', { length: 64 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_raw_record', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_raw_record_batch',
      columns: [table.rawBatchId],
      foreignColumns: [finappRawBatch.id],
    }).onDelete('restrict'),
    unique('finapp_uq_raw_record_batch_resource').on(
      table.rawBatchId,
      table.resourceType,
      table.externalResourceId,
    ),
    check(
      'finapp_ck_raw_record_resource_type',
      sql`${table.resourceType} IN ('ACCOUNT', 'HOLDING', 'TRANSACTION')`,
    ),
    index('finapp_idx_raw_record_checksum').on(table.payloadChecksum),
  ],
);

export const finappRawProcessingResult = finappMyDataSchema.table(
  'finapp_raw_processing_result',
  {
    id: uuid('id').notNull(),
    rawRecordId: uuid('raw_record_id').notNull(),
    processorVersion: varchar('processor_version', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    derivedResourceType: varchar('derived_resource_type', { length: 40 }),
    derivedResourceId: uuid('derived_resource_id'),
    errorCode: varchar('error_code', { length: 80 }),
    processedAt: timestamp('processed_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_raw_processing_result',
      columns: [table.id],
    }),
    foreignKey({
      name: 'finapp_fk_raw_processing_result_record',
      columns: [table.rawRecordId],
      foreignColumns: [finappRawRecord.id],
    }).onDelete('restrict'),
    unique('finapp_uq_raw_process_record_version').on(
      table.rawRecordId,
      table.processorVersion,
    ),
    check(
      'finapp_ck_raw_processing_status',
      sql`${table.status} IN ('PROCESSED', 'DUPLICATE', 'INVALID', 'FAILED')`,
    ),
  ],
);

export const finappFinancialAccount = finappWealthSchema.table(
  'finapp_financial_account',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    connectionId: uuid('connection_id').notNull(),
    institutionCode: varchar('institution_code', { length: 50 }).notNull(),
    externalAccountIdHash: varchar('external_account_id_hash', {
      length: 64,
    }).notNull(),
    maskedAccountNumber: varchar('masked_account_number', {
      length: 100,
    }).notNull(),
    accountType: varchar('account_type', { length: 30 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    openedAt: date('opened_at'),
    closedAt: date('closed_at'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_financial_account', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_financial_account_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_financial_account_connection',
      columns: [table.connectionId],
      foreignColumns: [finappInstitutionConnection.id],
    }).onDelete('restrict'),
    unique('finapp_uq_account_connection_external').on(
      table.connectionId,
      table.externalAccountIdHash,
    ),
    index('finapp_idx_account_user_status').on(table.userId, table.status),
  ],
);

export const finappInstrument = finappWealthSchema.table(
  'finapp_instrument',
  {
    id: uuid('id').notNull(),
    instrumentCode: varchar('instrument_code', { length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 150 }).notNull(),
    assetClass: varchar('asset_class', { length: 30 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_instrument', columns: [table.id] }),
    unique('finapp_uq_instrument_code').on(table.instrumentCode),
  ],
);

export const finappHolding = finappWealthSchema.table(
  'finapp_holding',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    externalHoldingId: varchar('external_holding_id', { length: 200 }),
    quantity: numeric('quantity', { precision: 19, scale: 8 })
      .notNull()
      .default('0'),
    averagePrice: numeric('average_price', { precision: 19, scale: 4 })
      .notNull()
      .default('0'),
    asOfAt: timestamp('as_of_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_holding', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_holding_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_holding_account',
      columns: [table.accountId],
      foreignColumns: [finappFinancialAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_holding_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappInstrument.id],
    }).onDelete('restrict'),
    unique('finapp_uq_holding_account_instrument').on(
      table.accountId,
      table.instrumentId,
    ),
    check(
      'finapp_ck_holding_values',
      sql`${table.quantity} >= 0 AND ${table.averagePrice} >= 0`,
    ),
    index('finapp_idx_holding_user_account').on(table.userId, table.accountId),
  ],
);

export const finappFinancialTransaction = finappWealthSchema.table(
  'finapp_financial_transaction',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    externalTransactionId: varchar('external_transaction_id', {
      length: 200,
    }).notNull(),
    transactionType: varchar('transaction_type', { length: 30 }).notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    rawRecordId: uuid('raw_record_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_financial_transaction',
      columns: [table.id],
    }),
    foreignKey({
      name: 'finapp_fk_financial_transaction_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_financial_transaction_account',
      columns: [table.accountId],
      foreignColumns: [finappFinancialAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_financial_transaction_raw',
      columns: [table.rawRecordId],
      foreignColumns: [finappRawRecord.id],
    }).onDelete('restrict'),
    unique('finapp_uq_transaction_account_external').on(
      table.accountId,
      table.externalTransactionId,
    ),
    index('finapp_idx_transaction_user_occurred').on(
      table.userId,
      table.occurredAt,
    ),
  ],
);

export const finappCashAccount = finappWealthSchema.table(
  'finapp_cash_account',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    availableBalance: numeric('available_balance', {
      precision: 19,
      scale: 4,
    })
      .notNull()
      .default('0'),
    reservedBalance: numeric('reserved_balance', {
      precision: 19,
      scale: 4,
    })
      .notNull()
      .default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_cash_account', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_cash_account_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_cash_account_account',
      columns: [table.accountId],
      foreignColumns: [finappFinancialAccount.id],
    }).onDelete('restrict'),
    unique('finapp_uq_cash_account_account').on(table.accountId),
    check(
      'finapp_ck_cash_account_balance',
      sql`${table.availableBalance} >= 0 AND ${table.reservedBalance} >= 0`,
    ),
  ],
);

export const finappAssetSnapshot = finappWealthSchema.table(
  'finapp_asset_snapshot',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    asOfDate: date('as_of_date').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    totalAssets: numeric('total_assets', { precision: 19, scale: 4 }).notNull(),
    cashAmount: numeric('cash_amount', { precision: 19, scale: 4 }).notNull(),
    investmentAmount: numeric('investment_amount', {
      precision: 19,
      scale: 4,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_asset_snapshot', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_asset_snapshot_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    unique('finapp_uq_asset_snapshot_user_date').on(
      table.userId,
      table.asOfDate,
      table.currency,
    ),
    check(
      'finapp_ck_asset_snapshot_amounts',
      sql`${table.totalAssets} >= 0 AND ${table.cashAmount} >= 0 AND ${table.investmentAmount} >= 0 AND ${table.totalAssets} = ${table.cashAmount} + ${table.investmentAmount}`,
    ),
    index('finapp_idx_asset_snapshot_user_date').on(
      table.userId,
      table.asOfDate,
    ),
  ],
);

export const finappAssetSnapshotAllocation = finappWealthSchema.table(
  'finapp_asset_snapshot_allocation',
  {
    id: uuid('id').notNull(),
    snapshotId: uuid('snapshot_id').notNull(),
    assetClass: varchar('asset_class', { length: 30 }).notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    weight: numeric('weight', { precision: 12, scale: 8 }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_asset_snapshot_allocation',
      columns: [table.id],
    }),
    foreignKey({
      name: 'finapp_fk_snapshot_allocation_snapshot',
      columns: [table.snapshotId],
      foreignColumns: [finappAssetSnapshot.id],
    }).onDelete('cascade'),
    unique('finapp_uq_snapshot_allocation_class').on(
      table.snapshotId,
      table.assetClass,
    ),
    check(
      'finapp_ck_snapshot_allocation_values',
      sql`${table.amount} >= 0 AND ${table.weight} BETWEEN 0 AND 1`,
    ),
  ],
);

export const finappAssumptionSet = finappSimulationSchema.table(
  'finapp_assumption_set',
  {
    id: uuid('id').notNull(),
    versionName: varchar('version_name', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    assetAssumptions: jsonb('asset_assumptions').notNull(),
    correlationMatrix: jsonb('correlation_matrix').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_assumption_set', columns: [table.id] }),
    unique('finapp_uq_assumption_set_version').on(table.versionName),
    check(
      'finapp_ck_assumption_set_status',
      sql`${table.status} IN ('ACTIVE', 'RETIRED')`,
    ),
  ],
);

export const finappSimulationRun = finappSimulationSchema.table(
  'finapp_simulation_run',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    assumptionSetId: uuid('assumption_set_id').notNull(),
    engineVersion: varchar('engine_version', { length: 30 }).notNull(),
    inputSnapshot: jsonb('input_snapshot').notNull(),
    seed: bigint('seed', { mode: 'bigint' }).notNull(),
    pathCount: integer('path_count').notNull().default(1000),
    durationMonths: integer('duration_months').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_simulation_run', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_simulation_run_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_simulation_run_assumption',
      columns: [table.assumptionSetId],
      foreignColumns: [finappAssumptionSet.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_simulation_run_values',
      sql`${table.pathCount} > 0 AND ${table.durationMonths} BETWEEN 1 AND 600`,
    ),
    check(
      'finapp_ck_simulation_run_status',
      sql`${table.status} IN ('RUNNING', 'COMPLETED', 'FAILED')`,
    ),
    index('finapp_idx_simulation_run_user_created').on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const finappSimulationResultSummary = finappSimulationSchema.table(
  'finapp_simulation_result_summary',
  {
    simulationRunId: uuid('simulation_run_id').notNull(),
    goalProbability: numeric('goal_probability', {
      precision: 12,
      scale: 8,
    }).notNull(),
    finalP10: numeric('final_p10', { precision: 19, scale: 4 }).notNull(),
    finalP50: numeric('final_p50', { precision: 19, scale: 4 }).notNull(),
    finalP90: numeric('final_p90', { precision: 19, scale: 4 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_simulation_result_summary',
      columns: [table.simulationRunId],
    }),
    foreignKey({
      name: 'finapp_fk_simulation_summary_run',
      columns: [table.simulationRunId],
      foreignColumns: [finappSimulationRun.id],
    }).onDelete('cascade'),
    check(
      'finapp_ck_sim_summary_percentiles',
      sql`${table.goalProbability} BETWEEN 0 AND 1 AND ${table.finalP10} >= 0 AND ${table.finalP10} <= ${table.finalP50} AND ${table.finalP50} <= ${table.finalP90}`,
    ),
  ],
);

export const finappSimulationResultPoint = finappSimulationSchema.table(
  'finapp_simulation_result_point',
  {
    simulationRunId: uuid('simulation_run_id').notNull(),
    month: integer('month').notNull(),
    p10: numeric('p10', { precision: 19, scale: 4 }).notNull(),
    p50: numeric('p50', { precision: 19, scale: 4 }).notNull(),
    p90: numeric('p90', { precision: 19, scale: 4 }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_simulation_result_point',
      columns: [table.simulationRunId, table.month],
    }),
    foreignKey({
      name: 'finapp_fk_simulation_point_run',
      columns: [table.simulationRunId],
      foreignColumns: [finappSimulationRun.id],
    }).onDelete('cascade'),
    check(
      'finapp_ck_sim_point_percentiles',
      sql`${table.month} BETWEEN 0 AND 600 AND ${table.p10} >= 0 AND ${table.p10} <= ${table.p50} AND ${table.p50} <= ${table.p90}`,
    ),
  ],
);

export const finappQuote = finappTradingSchema.table(
  'finapp_quote',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    side: varchar('side', { length: 10 }).notNull().default('BUY'),
    quantity: numeric('quantity', { precision: 19, scale: 8 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 19, scale: 4 }).notNull(),
    estimatedAmount: numeric('estimated_amount', {
      precision: 19,
      scale: 4,
    }).notNull(),
    fee: numeric('fee', { precision: 19, scale: 4 }).notNull().default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_quote', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_quote_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_quote_account',
      columns: [table.accountId],
      foreignColumns: [finappFinancialAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_quote_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappInstrument.id],
    }).onDelete('restrict'),
    check('finapp_ck_quote_side', sql`${table.side} = 'BUY'`),
    check(
      'finapp_ck_quote_values',
      sql`${table.quantity} > 0 AND ${table.unitPrice} > 0 AND ${table.estimatedAmount} > 0 AND ${table.fee} >= 0`,
    ),
    index('finapp_idx_quote_user_expires').on(table.userId, table.expiresAt),
  ],
);

export const finappIdempotencyRecord = finappTradingSchema.table(
  'finapp_idempotency_record',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    operation: varchar('operation', { length: 50 }).notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    resourceType: varchar('resource_type', { length: 40 }),
    resourceId: uuid('resource_id'),
    responseStatus: integer('response_status'),
    responseSnapshot: jsonb('response_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_idempotency_record', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_idempotency_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    unique('finapp_uq_idempotency_user_operation_key').on(
      table.userId,
      table.operation,
      table.idempotencyKey,
    ),
    check(
      'finapp_ck_idempotency_response_status',
      sql`${table.responseStatus} IS NULL OR ${table.responseStatus} BETWEEN 200 AND 599`,
    ),
  ],
);

export const finappTradeOrder = finappTradingSchema.table(
  'finapp_trade_order',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    quoteId: uuid('quote_id').notNull(),
    clientOrderId: uuid('client_order_id').notNull(),
    side: varchar('side', { length: 10 }).notNull().default('BUY'),
    quantity: numeric('quantity', { precision: 19, scale: 8 }).notNull(),
    estimatedAmount: numeric('estimated_amount', {
      precision: 19,
      scale: 4,
    }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('KRW'),
    status: varchar('status', { length: 30 })
      .notNull()
      .default('PENDING_SUBMISSION'),
    externalOrderId: varchar('external_order_id', { length: 100 }),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_trade_order', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_order_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_order_account',
      columns: [table.accountId],
      foreignColumns: [finappFinancialAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_order_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappInstrument.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_order_quote',
      columns: [table.quoteId],
      foreignColumns: [finappQuote.id],
    }).onDelete('restrict'),
    unique('finapp_uq_order_client_id').on(table.clientOrderId),
    check('finapp_ck_order_side', sql`${table.side} = 'BUY'`),
    check(
      'finapp_ck_order_values',
      sql`${table.quantity} > 0 AND ${table.estimatedAmount} > 0`,
    ),
    check(
      'finapp_ck_order_status',
      sql`${table.status} IN ('CREATED', 'FUNDS_RESERVED', 'PENDING_SUBMISSION', 'ACCEPTED', 'UNKNOWN', 'FILLED', 'REJECTED', 'FAILED', 'CANCELLED')`,
    ),
    index('finapp_idx_order_user_created').on(
      table.userId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('finapp_idx_order_status_updated').on(table.status, table.updatedAt),
  ],
);

export const finappFundReservation = finappTradingSchema.table(
  'finapp_fund_reservation',
  {
    id: uuid('id').notNull(),
    orderId: uuid('order_id').notNull(),
    cashAccountId: uuid('cash_account_id').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp('released_at', { withTimezone: true, mode: 'date' }),
    settledAt: timestamp('settled_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_fund_reservation', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_reservation_order',
      columns: [table.orderId],
      foreignColumns: [finappTradeOrder.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_reservation_cash_account',
      columns: [table.cashAccountId],
      foreignColumns: [finappCashAccount.id],
    }).onDelete('restrict'),
    check('finapp_ck_reservation_amount', sql`${table.amount} > 0`),
    check(
      'finapp_ck_reservation_status',
      sql`${table.status} IN ('ACTIVE', 'RELEASED', 'SETTLED', 'EXPIRED')`,
    ),
    uniqueIndex('finapp_uq_reservation_order_active')
      .on(table.orderId)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

export const finappOrderExecution = finappTradingSchema.table(
  'finapp_order_execution',
  {
    id: uuid('id').notNull(),
    orderId: uuid('order_id').notNull(),
    externalExecutionId: varchar('external_execution_id', {
      length: 140,
    }).notNull(),
    quantity: numeric('quantity', { precision: 19, scale: 8 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 19, scale: 4 }).notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    executedAt: timestamp('executed_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_order_execution', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_execution_order',
      columns: [table.orderId],
      foreignColumns: [finappTradeOrder.id],
    }).onDelete('restrict'),
    unique('finapp_uq_execution_external').on(table.externalExecutionId),
    unique('finapp_uq_execution_order').on(table.orderId),
    check(
      'finapp_ck_execution_values',
      sql`${table.quantity} > 0 AND ${table.unitPrice} > 0 AND ${table.amount} > 0`,
    ),
  ],
);

export const finappCashLedgerEntry = finappTradingSchema.table(
  'finapp_cash_ledger_entry',
  {
    id: uuid('id').notNull(),
    cashAccountId: uuid('cash_account_id').notNull(),
    orderId: uuid('order_id').notNull(),
    entryType: varchar('entry_type', { length: 30 }).notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    balanceAfter: numeric('balance_after', {
      precision: 19,
      scale: 4,
    }).notNull(),
    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_cash_ledger_entry', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_ledger_cash_account',
      columns: [table.cashAccountId],
      foreignColumns: [finappCashAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_ledger_order',
      columns: [table.orderId],
      foreignColumns: [finappTradeOrder.id],
    }).onDelete('restrict'),
    unique('finapp_uq_ledger_order_entry_type').on(
      table.orderId,
      table.entryType,
    ),
    check(
      'finapp_ck_ledger_entry_type',
      sql`${table.entryType} IN ('RESERVE', 'RELEASE', 'SETTLE')`,
    ),
    check('finapp_ck_ledger_balance', sql`${table.balanceAfter} >= 0`),
  ],
);

export const finappPosition = finappTradingSchema.table(
  'finapp_position',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id').notNull(),
    accountId: uuid('account_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    quantity: numeric('quantity', { precision: 19, scale: 8 })
      .notNull()
      .default('0'),
    averagePrice: numeric('average_price', { precision: 19, scale: 4 })
      .notNull()
      .default('0'),
    version: bigint('version', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_position', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_position_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_position_account',
      columns: [table.accountId],
      foreignColumns: [finappFinancialAccount.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finapp_fk_position_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappInstrument.id],
    }).onDelete('restrict'),
    unique('finapp_uq_position_account_instrument').on(
      table.accountId,
      table.instrumentId,
    ),
    check(
      'finapp_ck_position_values',
      sql`${table.quantity} >= 0 AND ${table.averagePrice} >= 0`,
    ),
  ],
);

export const finappReconciliationJob = finappTradingSchema.table(
  'finapp_reconciliation_job',
  {
    id: uuid('id').notNull(),
    orderId: uuid('order_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('QUEUED'),
    attempt: integer('attempt').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),
    lockedBy: varchar('locked_by', { length: 100 }),
    lastErrorCode: varchar('last_error_code', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_reconciliation_job', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_reconciliation_order',
      columns: [table.orderId],
      foreignColumns: [finappTradeOrder.id],
    }).onDelete('restrict'),
    check('finapp_ck_reconciliation_attempt', sql`${table.attempt} >= 0`),
    check(
      'finapp_ck_reconciliation_status',
      sql`${table.status} IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')`,
    ),
    index('finapp_idx_reconcile_claim').on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    uniqueIndex('finapp_uq_reconcile_order_active')
      .on(table.orderId)
      .where(sql`${table.status} IN ('QUEUED', 'PROCESSING')`),
  ],
);

export const finappOutboxEvent = finappTradingSchema.table(
  'finapp_outbox_event',
  {
    id: uuid('id').notNull(),
    aggregateType: varchar('aggregate_type', { length: 50 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    attempt: integer('attempt').notNull().default(0),
    availableAt: timestamp('available_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),
    lockedBy: varchar('locked_by', { length: 100 }),
    lastErrorCode: varchar('last_error_code', { length: 80 }),
    processedAt: timestamp('processed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_outbox_event', columns: [table.id] }),
    unique('finapp_uq_outbox_aggregate_event').on(
      table.aggregateType,
      table.aggregateId,
      table.eventType,
    ),
    check('finapp_ck_outbox_attempt', sql`${table.attempt} >= 0`),
    check(
      'finapp_ck_outbox_status',
      sql`${table.status} IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')`,
    ),
    index('finapp_idx_outbox_status_available').on(
      table.status,
      table.availableAt,
      table.createdAt,
    ),
  ],
);

export const finappOutboxDelivery = finappTradingSchema.table(
  'finapp_outbox_delivery',
  {
    id: uuid('id').notNull(),
    eventId: uuid('event_id').notNull(),
    consumerName: varchar('consumer_name', { length: 100 }).notNull(),
    deliveredAt: timestamp('delivered_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_outbox_delivery', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_outbox_delivery_event',
      columns: [table.eventId],
      foreignColumns: [finappOutboxEvent.id],
    }).onDelete('restrict'),
    unique('finapp_uq_outbox_delivery_event_consumer').on(
      table.eventId,
      table.consumerName,
    ),
  ],
);

export const finappAuditEvent = finappAuditSchema.table(
  'finapp_audit_event',
  {
    id: uuid('id').notNull(),
    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    userId: uuid('user_id'),
    action: varchar('action', { length: 80 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: uuid('resource_id'),
    result: varchar('result', { length: 20 }).notNull(),
    reasonCode: varchar('reason_code', { length: 80 }),
    traceId: varchar('trace_id', { length: 100 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_audit_event', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_audit_event_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_audit_result',
      sql`${table.result} IN ('SUCCESS', 'FAILURE', 'UNKNOWN')`,
    ),
    index('finapp_idx_audit_user_time').on(table.userId, table.occurredAt),
    index('finapp_idx_audit_action_time').on(table.action, table.occurredAt),
  ],
);

export const finappSecurityEvent = finappAuditSchema.table(
  'finapp_security_event',
  {
    id: uuid('id').notNull(),
    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    userId: uuid('user_id'),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    result: varchar('result', { length: 20 }).notNull(),
    reasonCode: varchar('reason_code', { length: 80 }).notNull(),
    traceId: varchar('trace_id', { length: 100 }).notNull(),
    sourceIpHash: varchar('source_ip_hash', { length: 64 }),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_security_event', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_security_event_user',
      columns: [table.userId],
      foreignColumns: [finappAppUser.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_security_event_type',
      sql`${table.eventType} IN ('AUTHENTICATION_FAILURE', 'AUTHORIZATION_FAILURE', 'SUSPICIOUS_REQUEST')`,
    ),
    check(
      'finapp_ck_security_event_result',
      sql`${table.result} IN ('SUCCESS', 'FAILURE')`,
    ),
    index('finapp_idx_security_event_type_time').on(
      table.eventType,
      table.occurredAt,
    ),
    index('finapp_idx_security_event_source_time').on(
      table.sourceIpHash,
      table.occurredAt,
    ),
  ],
);

export const finappMarketInstrument = finappMarketSchema.table(
  'finapp_market_instrument',
  {
    id: uuid('id').notNull(),
    symbol: varchar('symbol', { length: 12 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    market: varchar('market', { length: 20 }).notNull(),
    industry: varchar('industry', { length: 200 }),
    standardCode: varchar('standard_code', { length: 32 }),
    basePrice: numeric('base_price', { precision: 19, scale: 4 }),
    listedAt: date('listed_at'),
    active: boolean('active').notNull().default(true),
    source: varchar('source', { length: 20 }).notNull(),
    raw: jsonb('raw').notNull().default({}),
    syncedAt: timestamp('synced_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_market_instrument', columns: [table.id] }),
    unique('finapp_uq_market_instrument_symbol').on(table.symbol),
    check(
      'finapp_ck_market_instrument_market',
      sql`${table.market} IN ('KOSPI', 'KOSDAQ')`,
    ),
    check(
      'finapp_ck_market_instrument_source',
      sql`${table.source} = 'KIS_MASTER'`,
    ),
    index('finapp_idx_market_instrument_name').on(table.name),
    index('finapp_idx_market_instrument_market_symbol').on(
      table.market,
      table.symbol,
    ),
  ],
);

export const finappMarketQuoteSnapshot = finappMarketSchema.table(
  'finapp_market_quote_snapshot',
  {
    id: uuid('id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    currentPrice: numeric('current_price', {
      precision: 19,
      scale: 4,
    }).notNull(),
    changePrice: numeric('change_price', { precision: 19, scale: 4 }).notNull(),
    changeRate: numeric('change_rate', { precision: 10, scale: 4 }).notNull(),
    volume: bigint('volume', { mode: 'bigint' }).notNull(),
    source: varchar('source', { length: 20 }).notNull(),
    capturedAt: timestamp('captured_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    raw: jsonb('raw').notNull().default({}),
  },
  (table) => [
    primaryKey({
      name: 'finapp_pk_market_quote_snapshot',
      columns: [table.id],
    }),
    foreignKey({
      name: 'finapp_fk_market_quote_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappMarketInstrument.id],
    }).onDelete('restrict'),
    check(
      'finapp_ck_market_quote_source',
      sql`${table.source} IN ('KIS', 'LOCAL')`,
    ),
    check(
      'finapp_ck_market_quote_values',
      sql`${table.currentPrice} > 0 AND ${table.volume} >= 0`,
    ),
    index('finapp_idx_market_quote_instrument_captured').on(
      table.instrumentId,
      table.capturedAt,
    ),
  ],
);

export const finappMarketPriceBar = finappMarketSchema.table(
  'finapp_market_price_bar',
  {
    id: uuid('id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    interval: varchar('interval', { length: 20 }).notNull(),
    bucketAt: timestamp('bucket_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    open: numeric('open', { precision: 19, scale: 4 }).notNull(),
    high: numeric('high', { precision: 19, scale: 4 }).notNull(),
    low: numeric('low', { precision: 19, scale: 4 }).notNull(),
    close: numeric('close', { precision: 19, scale: 4 }).notNull(),
    volume: bigint('volume', { mode: 'bigint' }).notNull(),
    source: varchar('source', { length: 20 }).notNull(),
    raw: jsonb('raw').notNull().default({}),
  },
  (table) => [
    primaryKey({ name: 'finapp_pk_market_price_bar', columns: [table.id] }),
    foreignKey({
      name: 'finapp_fk_market_bar_instrument',
      columns: [table.instrumentId],
      foreignColumns: [finappMarketInstrument.id],
    }).onDelete('restrict'),
    unique('finapp_uq_market_bar_bucket').on(
      table.instrumentId,
      table.interval,
      table.bucketAt,
    ),
    check(
      'finapp_ck_market_bar_interval',
      sql`${table.interval} IN ('MINUTE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')`,
    ),
    check(
      'finapp_ck_market_bar_source',
      sql`${table.source} IN ('KIS', 'LOCAL')`,
    ),
    check(
      'finapp_ck_market_bar_ohlc',
      sql`${table.high} >= ${table.low} AND ${table.volume} >= 0`,
    ),
    index('finapp_idx_market_bar_lookup').on(
      table.instrumentId,
      table.interval,
      table.bucketAt,
    ),
  ],
);
