GRANT USAGE ON SCHEMA "finapp_simulator" TO financial_simulator_app;

CREATE TABLE "finapp_simulator"."finapp_sim_customer" (
  "id" uuid NOT NULL,
  "external_customer_id" varchar(100) NOT NULL,
  "preset" varchar(40) NOT NULL,
  "display_name" varchar(100) NOT NULL,
  "seed" bigint NOT NULL,
  "dataset_version" varchar(50) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_sim_customer" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_uq_sim_customer_external" UNIQUE ("external_customer_id")
);

CREATE TABLE "finapp_simulator"."finapp_sim_account" (
  "id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "external_account_id" varchar(100) NOT NULL,
  "masked_account_number" varchar(100) NOT NULL,
  "account_type" varchar(30) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "cash_balance" numeric(19,4) NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_sim_account" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_sim_account_customer" FOREIGN KEY ("customer_id")
    REFERENCES "finapp_simulator"."finapp_sim_customer" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_sim_account_customer_external" UNIQUE ("customer_id", "external_account_id"),
  CONSTRAINT "finapp_ck_sim_account_cash" CHECK ("cash_balance" >= 0)
);

CREATE TABLE "finapp_simulator"."finapp_sim_instrument" (
  "id" uuid NOT NULL,
  "instrument_code" varchar(50) NOT NULL,
  "display_name" varchar(150) NOT NULL,
  "asset_class" varchar(30) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  CONSTRAINT "finapp_pk_sim_instrument" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_uq_sim_instrument_code" UNIQUE ("instrument_code")
);

CREATE TABLE "finapp_simulator"."finapp_sim_holding" (
  "id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "external_holding_id" varchar(100) NOT NULL,
  "quantity" numeric(19,8) NOT NULL,
  "average_price" numeric(19,4) NOT NULL,
  "as_of_at" timestamptz NOT NULL,
  CONSTRAINT "finapp_pk_sim_holding" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_sim_holding_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_simulator"."finapp_sim_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_sim_holding_instrument" FOREIGN KEY ("instrument_id")
    REFERENCES "finapp_simulator"."finapp_sim_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_sim_holding_account_instrument" UNIQUE ("account_id", "instrument_id"),
  CONSTRAINT "finapp_ck_sim_holding_values" CHECK ("quantity" >= 0 AND "average_price" >= 0)
);

CREATE TABLE "finapp_simulator"."finapp_sim_transaction" (
  "id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "external_transaction_id" varchar(100) NOT NULL,
  "transaction_type" varchar(30) NOT NULL,
  "amount" numeric(19,4) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  CONSTRAINT "finapp_pk_sim_transaction" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_sim_transaction_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_simulator"."finapp_sim_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_sim_transaction_account_external" UNIQUE ("account_id", "external_transaction_id")
);

CREATE INDEX "finapp_idx_sim_transaction_account_time"
  ON "finapp_simulator"."finapp_sim_transaction" ("account_id", "occurred_at");

GRANT SELECT, INSERT, UPDATE, DELETE
  ON "finapp_simulator"."finapp_sim_customer",
     "finapp_simulator"."finapp_sim_account",
     "finapp_simulator"."finapp_sim_instrument",
     "finapp_simulator"."finapp_sim_holding",
     "finapp_simulator"."finapp_sim_transaction"
  TO financial_simulator_app;
