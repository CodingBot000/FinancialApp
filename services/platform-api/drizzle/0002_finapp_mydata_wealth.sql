CREATE TABLE "finapp_mydata"."finapp_institution_connection" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "institution_code" varchar(50) NOT NULL,
  "external_customer_id_hash" char(64) NOT NULL,
  "external_customer_id_ciphertext" bytea NOT NULL,
  "encryption_key_version" varchar(32) NOT NULL,
  "masked_external_customer_id" varchar(100) NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "consent_expires_at" timestamptz NOT NULL,
  "last_successful_sync_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_institution_connection" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_connection_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_connection_status" CHECK ("status" IN ('ACTIVE', 'REVOKED', 'EXPIRED'))
);

CREATE UNIQUE INDEX "finapp_uq_connection_user_institution_active"
  ON "finapp_mydata"."finapp_institution_connection" ("user_id", "institution_code")
  WHERE "status" = 'ACTIVE';

CREATE TABLE "finapp_mydata"."finapp_sync_job" (
  "id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "status" varchar(24) DEFAULT 'QUEUED' NOT NULL,
  "attempt" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz,
  "locked_at" timestamptz,
  "locked_by" varchar(100),
  "error_code" varchar(80),
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_sync_job" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_sync_job_connection" FOREIGN KEY ("connection_id")
    REFERENCES "finapp_mydata"."finapp_institution_connection" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_sync_job_attempt" CHECK ("attempt" >= 0),
  CONSTRAINT "finapp_ck_sync_job_status" CHECK ("status" IN ('QUEUED', 'FETCHING', 'RAW_STORED', 'NORMALIZING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX "finapp_idx_sync_job_claim"
  ON "finapp_mydata"."finapp_sync_job" ("status", "next_attempt_at", "created_at");
CREATE INDEX "finapp_idx_sync_job_connection_created"
  ON "finapp_mydata"."finapp_sync_job" ("connection_id", "created_at" DESC);
CREATE UNIQUE INDEX "finapp_uq_sync_job_connection_active"
  ON "finapp_mydata"."finapp_sync_job" ("connection_id")
  WHERE "status" IN ('QUEUED', 'FETCHING', 'RAW_STORED', 'NORMALIZING');

CREATE TABLE "finapp_mydata"."finapp_raw_batch" (
  "id" uuid NOT NULL,
  "sync_job_id" uuid NOT NULL,
  "resource_type" varchar(30) NOT NULL,
  "request_id" varchar(100) NOT NULL,
  "schema_version" varchar(30) NOT NULL,
  "page_cursor" varchar(500),
  "payload_checksum" char(64) NOT NULL,
  "received_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_raw_batch" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_raw_batch_sync_job" FOREIGN KEY ("sync_job_id")
    REFERENCES "finapp_mydata"."finapp_sync_job" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_raw_batch_resource_type" CHECK ("resource_type" IN ('ACCOUNT', 'HOLDING', 'TRANSACTION'))
);

CREATE INDEX "finapp_idx_raw_batch_sync"
  ON "finapp_mydata"."finapp_raw_batch" ("sync_job_id");
CREATE INDEX "finapp_idx_raw_batch_checksum"
  ON "finapp_mydata"."finapp_raw_batch" ("payload_checksum");

CREATE TABLE "finapp_mydata"."finapp_raw_record" (
  "id" uuid NOT NULL,
  "raw_batch_id" uuid NOT NULL,
  "resource_type" varchar(30) NOT NULL,
  "external_resource_id" varchar(200) NOT NULL,
  "payload" jsonb NOT NULL,
  "payload_checksum" char(64) NOT NULL,
  "received_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_raw_record" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_raw_record_batch" FOREIGN KEY ("raw_batch_id")
    REFERENCES "finapp_mydata"."finapp_raw_batch" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_raw_record_batch_resource" UNIQUE ("raw_batch_id", "resource_type", "external_resource_id"),
  CONSTRAINT "finapp_ck_raw_record_resource_type" CHECK ("resource_type" IN ('ACCOUNT', 'HOLDING', 'TRANSACTION'))
);

CREATE INDEX "finapp_idx_raw_record_checksum"
  ON "finapp_mydata"."finapp_raw_record" ("payload_checksum");

CREATE TABLE "finapp_mydata"."finapp_raw_processing_result" (
  "id" uuid NOT NULL,
  "raw_record_id" uuid NOT NULL,
  "processor_version" varchar(30) NOT NULL,
  "status" varchar(20) NOT NULL,
  "derived_resource_type" varchar(40),
  "derived_resource_id" uuid,
  "error_code" varchar(80),
  "processed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_raw_processing_result" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_raw_processing_result_record" FOREIGN KEY ("raw_record_id")
    REFERENCES "finapp_mydata"."finapp_raw_record" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_raw_process_record_version" UNIQUE ("raw_record_id", "processor_version"),
  CONSTRAINT "finapp_ck_raw_processing_status" CHECK ("status" IN ('PROCESSED', 'DUPLICATE', 'INVALID', 'FAILED'))
);

CREATE TABLE "finapp_wealth"."finapp_financial_account" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "institution_code" varchar(50) NOT NULL,
  "external_account_id_hash" char(64) NOT NULL,
  "masked_account_number" varchar(100) NOT NULL,
  "account_type" varchar(30) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "opened_at" date,
  "closed_at" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_financial_account" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_financial_account_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_financial_account_connection" FOREIGN KEY ("connection_id")
    REFERENCES "finapp_mydata"."finapp_institution_connection" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_account_connection_external" UNIQUE ("connection_id", "external_account_id_hash")
);

CREATE INDEX "finapp_idx_account_user_status"
  ON "finapp_wealth"."finapp_financial_account" ("user_id", "status");

CREATE TABLE "finapp_wealth"."finapp_instrument" (
  "id" uuid NOT NULL,
  "instrument_code" varchar(50) NOT NULL,
  "display_name" varchar(150) NOT NULL,
  "asset_class" varchar(30) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_instrument" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_uq_instrument_code" UNIQUE ("instrument_code")
);

CREATE TABLE "finapp_wealth"."finapp_holding" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "external_holding_id" varchar(200),
  "quantity" numeric(19,8) DEFAULT 0 NOT NULL,
  "average_price" numeric(19,4) DEFAULT 0 NOT NULL,
  "as_of_at" timestamptz NOT NULL,
  "version" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_holding" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_holding_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_holding_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_wealth"."finapp_financial_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_holding_instrument" FOREIGN KEY ("instrument_id")
    REFERENCES "finapp_wealth"."finapp_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_holding_account_instrument" UNIQUE ("account_id", "instrument_id"),
  CONSTRAINT "finapp_ck_holding_values" CHECK ("quantity" >= 0 AND "average_price" >= 0)
);

CREATE INDEX "finapp_idx_holding_user_account"
  ON "finapp_wealth"."finapp_holding" ("user_id", "account_id");

CREATE TABLE "finapp_wealth"."finapp_financial_transaction" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "external_transaction_id" varchar(200) NOT NULL,
  "transaction_type" varchar(30) NOT NULL,
  "amount" numeric(19,4) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "raw_record_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_financial_transaction" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_financial_transaction_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_financial_transaction_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_wealth"."finapp_financial_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_financial_transaction_raw" FOREIGN KEY ("raw_record_id")
    REFERENCES "finapp_mydata"."finapp_raw_record" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_transaction_account_external" UNIQUE ("account_id", "external_transaction_id")
);

CREATE INDEX "finapp_idx_transaction_user_occurred"
  ON "finapp_wealth"."finapp_financial_transaction" ("user_id", "occurred_at" DESC);

CREATE TABLE "finapp_wealth"."finapp_cash_account" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "available_balance" numeric(19,4) DEFAULT 0 NOT NULL,
  "reserved_balance" numeric(19,4) DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "version" bigint DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_cash_account" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_cash_account_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_cash_account_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_wealth"."finapp_financial_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_cash_account_account" UNIQUE ("account_id"),
  CONSTRAINT "finapp_ck_cash_account_balance" CHECK ("available_balance" >= 0 AND "reserved_balance" >= 0)
);

CREATE TABLE "finapp_wealth"."finapp_asset_snapshot" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "as_of_date" date NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "total_assets" numeric(19,4) NOT NULL,
  "cash_amount" numeric(19,4) NOT NULL,
  "investment_amount" numeric(19,4) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_asset_snapshot" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_asset_snapshot_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_asset_snapshot_user_date" UNIQUE ("user_id", "as_of_date", "currency"),
  CONSTRAINT "finapp_ck_asset_snapshot_amounts" CHECK (
    "total_assets" >= 0 AND "cash_amount" >= 0 AND "investment_amount" >= 0
    AND "total_assets" = "cash_amount" + "investment_amount"
  )
);

CREATE INDEX "finapp_idx_asset_snapshot_user_date"
  ON "finapp_wealth"."finapp_asset_snapshot" ("user_id", "as_of_date" DESC);

CREATE TABLE "finapp_wealth"."finapp_asset_snapshot_allocation" (
  "id" uuid NOT NULL,
  "snapshot_id" uuid NOT NULL,
  "asset_class" varchar(30) NOT NULL,
  "amount" numeric(19,4) NOT NULL,
  "weight" numeric(12,8) NOT NULL,
  CONSTRAINT "finapp_pk_asset_snapshot_allocation" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_snapshot_allocation_snapshot" FOREIGN KEY ("snapshot_id")
    REFERENCES "finapp_wealth"."finapp_asset_snapshot" ("id") ON DELETE CASCADE,
  CONSTRAINT "finapp_uq_snapshot_allocation_class" UNIQUE ("snapshot_id", "asset_class"),
  CONSTRAINT "finapp_ck_snapshot_allocation_values" CHECK ("amount" >= 0 AND "weight" BETWEEN 0 AND 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON "finapp_mydata"."finapp_institution_connection",
     "finapp_mydata"."finapp_sync_job",
     "finapp_wealth"."finapp_financial_account",
     "finapp_wealth"."finapp_instrument",
     "finapp_wealth"."finapp_holding",
     "finapp_wealth"."finapp_financial_transaction",
     "finapp_wealth"."finapp_cash_account",
     "finapp_wealth"."finapp_asset_snapshot",
     "finapp_wealth"."finapp_asset_snapshot_allocation"
  TO financial_platform_app;

GRANT SELECT, INSERT
  ON "finapp_mydata"."finapp_raw_batch",
     "finapp_mydata"."finapp_raw_record",
     "finapp_mydata"."finapp_raw_processing_result"
  TO financial_platform_app;

REVOKE UPDATE, DELETE
  ON "finapp_mydata"."finapp_raw_batch",
     "finapp_mydata"."finapp_raw_record",
     "finapp_mydata"."finapp_raw_processing_result"
  FROM financial_platform_app;
