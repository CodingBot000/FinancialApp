CREATE TABLE "finapp_trading"."finapp_idempotency_record" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "operation" varchar(50) NOT NULL,
  "idempotency_key" uuid NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "resource_type" varchar(40),
  "resource_id" uuid,
  "response_status" integer,
  "response_snapshot" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "finapp_pk_idempotency_record" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_idempotency_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_idempotency_user_operation_key" UNIQUE ("user_id", "operation", "idempotency_key"),
  CONSTRAINT "finapp_ck_idempotency_response_status" CHECK (
    "response_status" IS NULL OR "response_status" BETWEEN 200 AND 599
  )
);

CREATE TABLE "finapp_trading"."finapp_trade_order" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "quote_id" uuid NOT NULL,
  "client_order_id" uuid NOT NULL,
  "side" varchar(10) DEFAULT 'BUY' NOT NULL,
  "quantity" numeric(19,8) NOT NULL,
  "estimated_amount" numeric(19,4) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "status" varchar(30) DEFAULT 'PENDING_SUBMISSION' NOT NULL,
  "external_order_id" varchar(100),
  "version" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_trade_order" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_order_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_order_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_wealth"."finapp_financial_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_order_instrument" FOREIGN KEY ("instrument_id")
    REFERENCES "finapp_wealth"."finapp_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_order_quote" FOREIGN KEY ("quote_id")
    REFERENCES "finapp_trading"."finapp_quote" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_order_client_id" UNIQUE ("client_order_id"),
  CONSTRAINT "finapp_ck_order_side" CHECK ("side" = 'BUY'),
  CONSTRAINT "finapp_ck_order_values" CHECK ("quantity" > 0 AND "estimated_amount" > 0),
  CONSTRAINT "finapp_ck_order_status" CHECK (
    "status" IN ('CREATED', 'FUNDS_RESERVED', 'PENDING_SUBMISSION', 'ACCEPTED', 'UNKNOWN', 'FILLED', 'REJECTED', 'FAILED', 'CANCELLED')
  )
);

CREATE INDEX "finapp_idx_order_user_created"
  ON "finapp_trading"."finapp_trade_order" ("user_id", "created_at" DESC);
CREATE INDEX "finapp_idx_order_status_updated"
  ON "finapp_trading"."finapp_trade_order" ("status", "updated_at");

CREATE TABLE "finapp_trading"."finapp_fund_reservation" (
  "id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "cash_account_id" uuid NOT NULL,
  "amount" numeric(19,4) NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "released_at" timestamptz,
  "settled_at" timestamptz,
  CONSTRAINT "finapp_pk_fund_reservation" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_reservation_order" FOREIGN KEY ("order_id")
    REFERENCES "finapp_trading"."finapp_trade_order" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_reservation_cash_account" FOREIGN KEY ("cash_account_id")
    REFERENCES "finapp_wealth"."finapp_cash_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_reservation_amount" CHECK ("amount" > 0),
  CONSTRAINT "finapp_ck_reservation_status" CHECK (
    "status" IN ('ACTIVE', 'RELEASED', 'SETTLED', 'EXPIRED')
  )
);

CREATE UNIQUE INDEX "finapp_uq_reservation_order_active"
  ON "finapp_trading"."finapp_fund_reservation" ("order_id")
  WHERE "status" = 'ACTIVE';

GRANT SELECT, INSERT
  ON "finapp_trading"."finapp_idempotency_record"
  TO financial_platform_app;

GRANT SELECT, INSERT, UPDATE
  ON "finapp_trading"."finapp_trade_order",
     "finapp_trading"."finapp_fund_reservation"
  TO financial_platform_app;

REVOKE UPDATE, DELETE
  ON "finapp_trading"."finapp_idempotency_record"
  FROM financial_platform_app;

REVOKE DELETE
  ON "finapp_trading"."finapp_trade_order",
     "finapp_trading"."finapp_fund_reservation"
  FROM financial_platform_app;
