import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgSchema,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const finappMetaSchema = pgSchema('finapp_meta');
export const finappIdentitySchema = pgSchema('finapp_identity');
export const finappMyDataSchema = pgSchema('finapp_mydata');
export const finappWealthSchema = pgSchema('finapp_wealth');
export const finappSimulationSchema = pgSchema('finapp_simulation');
export const finappTradingSchema = pgSchema('finapp_trading');
export const finappAuditSchema = pgSchema('finapp_audit');
export const finappCryptoSchema = pgSchema('finapp_crypto');

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
    version: bigint('version', { mode: 'bigint' }).notNull().default(0n),
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
