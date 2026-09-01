CREATE TABLE "finapp_trading"."finapp_order_execution" (
  "id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "external_execution_id" varchar(140) NOT NULL,
  "quantity" numeric(19,8) NOT NULL,
  "unit_price" numeric(19,4) NOT NULL,
  "amount" numeric(19,4) NOT NULL,
  "executed_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_order_execution" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_execution_order" FOREIGN KEY ("order_id") REFERENCES "finapp_trading"."finapp_trade_order" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_execution_external" UNIQUE ("external_execution_id"),
  CONSTRAINT "finapp_uq_execution_order" UNIQUE ("order_id"),
  CONSTRAINT "finapp_ck_execution_values" CHECK ("quantity" > 0 AND "unit_price" > 0 AND "amount" > 0)
);

CREATE TABLE "finapp_trading"."finapp_cash_ledger_entry" (
  "id" uuid NOT NULL,
  "cash_account_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "entry_type" varchar(30) NOT NULL,
  "amount" numeric(19,4) NOT NULL,
  "balance_after" numeric(19,4) NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  CONSTRAINT "finapp_pk_cash_ledger_entry" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_ledger_cash_account" FOREIGN KEY ("cash_account_id") REFERENCES "finapp_wealth"."finapp_cash_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_ledger_order" FOREIGN KEY ("order_id") REFERENCES "finapp_trading"."finapp_trade_order" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_ledger_order_entry_type" UNIQUE ("order_id", "entry_type"),
  CONSTRAINT "finapp_ck_ledger_entry_type" CHECK ("entry_type" IN ('RESERVE', 'RELEASE', 'SETTLE')),
  CONSTRAINT "finapp_ck_ledger_balance" CHECK ("balance_after" >= 0)
);

CREATE TABLE "finapp_trading"."finapp_position" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "quantity" numeric(19,8) DEFAULT 0 NOT NULL,
  "average_price" numeric(19,4) DEFAULT 0 NOT NULL,
  "version" bigint DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_position" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_position_user" FOREIGN KEY ("user_id") REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_position_account" FOREIGN KEY ("account_id") REFERENCES "finapp_wealth"."finapp_financial_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_position_instrument" FOREIGN KEY ("instrument_id") REFERENCES "finapp_wealth"."finapp_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_position_account_instrument" UNIQUE ("account_id", "instrument_id"),
  CONSTRAINT "finapp_ck_position_values" CHECK ("quantity" >= 0 AND "average_price" >= 0)
);

CREATE TABLE "finapp_trading"."finapp_reconciliation_job" (
  "id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "status" varchar(20) DEFAULT 'QUEUED' NOT NULL,
  "attempt" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz NOT NULL,
  "locked_at" timestamptz,
  "locked_by" varchar(100),
  "last_error_code" varchar(80),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  CONSTRAINT "finapp_pk_reconciliation_job" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_reconciliation_order" FOREIGN KEY ("order_id") REFERENCES "finapp_trading"."finapp_trade_order" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_reconciliation_attempt" CHECK ("attempt" >= 0),
  CONSTRAINT "finapp_ck_reconciliation_status" CHECK ("status" IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'))
);
CREATE INDEX "finapp_idx_reconcile_claim" ON "finapp_trading"."finapp_reconciliation_job" ("status", "next_attempt_at", "created_at");
CREATE UNIQUE INDEX "finapp_uq_reconcile_order_active" ON "finapp_trading"."finapp_reconciliation_job" ("order_id") WHERE "status" IN ('QUEUED', 'PROCESSING');

CREATE TABLE "finapp_audit"."finapp_audit_event" (
  "id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "user_id" uuid,
  "action" varchar(80) NOT NULL,
  "resource_type" varchar(50),
  "resource_id" uuid,
  "result" varchar(20) NOT NULL,
  "reason_code" varchar(80),
  "trace_id" varchar(100) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "finapp_pk_audit_event" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_audit_event_user" FOREIGN KEY ("user_id") REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_audit_result" CHECK ("result" IN ('SUCCESS', 'FAILURE', 'UNKNOWN'))
);
CREATE INDEX "finapp_idx_audit_user_time" ON "finapp_audit"."finapp_audit_event" ("user_id", "occurred_at");
CREATE INDEX "finapp_idx_audit_action_time" ON "finapp_audit"."finapp_audit_event" ("action", "occurred_at");

GRANT SELECT, INSERT ON "finapp_trading"."finapp_order_execution", "finapp_trading"."finapp_cash_ledger_entry" TO financial_platform_app;
GRANT SELECT, INSERT, UPDATE ON "finapp_trading"."finapp_position", "finapp_trading"."finapp_reconciliation_job" TO financial_platform_app;
GRANT SELECT, INSERT ON "finapp_audit"."finapp_audit_event" TO financial_platform_app;

REVOKE UPDATE, DELETE ON "finapp_trading"."finapp_order_execution", "finapp_trading"."finapp_cash_ledger_entry", "finapp_audit"."finapp_audit_event" FROM financial_platform_app;
REVOKE DELETE ON "finapp_trading"."finapp_position", "finapp_trading"."finapp_reconciliation_job" FROM financial_platform_app;
