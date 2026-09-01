CREATE TABLE "finapp_simulator"."finapp_sim_market_price" (
  "id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "price" numeric(19,4) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "as_of_at" timestamptz NOT NULL,
  CONSTRAINT "finapp_pk_sim_market_price" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_sim_price_instrument" FOREIGN KEY ("instrument_id")
    REFERENCES "finapp_simulator"."finapp_sim_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_sim_price_instrument_time" UNIQUE ("instrument_id", "as_of_at"),
  CONSTRAINT "finapp_ck_sim_market_price_positive" CHECK ("price" > 0)
);

CREATE INDEX "finapp_idx_sim_price_instrument_time"
  ON "finapp_simulator"."finapp_sim_market_price" ("instrument_id", "as_of_at");

CREATE TABLE "finapp_simulator"."finapp_sim_order" (
  "id" uuid NOT NULL,
  "client_order_id" uuid NOT NULL,
  "external_order_id" varchar(100) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "account_id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "side" varchar(10) DEFAULT 'BUY' NOT NULL,
  "quantity" numeric(19,8) NOT NULL,
  "unit_price" numeric(19,4),
  "status" varchar(30) NOT NULL,
  "scenario_mode" varchar(50) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "filled_at" timestamptz,
  CONSTRAINT "finapp_pk_sim_order" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_sim_order_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_simulator"."finapp_sim_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_sim_order_instrument" FOREIGN KEY ("instrument_id")
    REFERENCES "finapp_simulator"."finapp_sim_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_sim_order_client_id" UNIQUE ("client_order_id"),
  CONSTRAINT "finapp_uq_sim_order_external" UNIQUE ("external_order_id"),
  CONSTRAINT "finapp_ck_sim_order_side" CHECK ("side" = 'BUY'),
  CONSTRAINT "finapp_ck_sim_order_quantity" CHECK ("quantity" > 0 AND ("unit_price" IS NULL OR "unit_price" > 0)),
  CONSTRAINT "finapp_ck_sim_order_status" CHECK ("status" IN ('FILLED', 'REJECTED', 'UNKNOWN'))
);

CREATE INDEX "finapp_idx_sim_order_status_updated"
  ON "finapp_simulator"."finapp_sim_order" ("status", "updated_at");

CREATE TABLE "finapp_simulator"."finapp_sim_scenario" (
  "id" uuid NOT NULL,
  "scope_type" varchar(30) NOT NULL,
  "scope_key" varchar(100) NOT NULL,
  "mode" varchar(50) NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_sim_scenario" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_uq_sim_scenario_scope" UNIQUE ("scope_type", "scope_key"),
  CONSTRAINT "finapp_ck_sim_scenario_mode" CHECK ("mode" IN ('NORMAL', 'TIMEOUT', 'HTTP_500', 'MALFORMED_RESPONSE', 'ORDER_REJECT', 'ORDER_UNKNOWN_THEN_FILLED'))
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON "finapp_simulator"."finapp_sim_market_price",
     "finapp_simulator"."finapp_sim_order",
     "finapp_simulator"."finapp_sim_scenario"
  TO financial_simulator_app;
