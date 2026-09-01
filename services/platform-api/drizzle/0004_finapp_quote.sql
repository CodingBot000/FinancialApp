CREATE TABLE "finapp_trading"."finapp_quote" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "instrument_id" uuid NOT NULL,
  "side" varchar(10) DEFAULT 'BUY' NOT NULL,
  "quantity" numeric(19,8) NOT NULL,
  "unit_price" numeric(19,4) NOT NULL,
  "estimated_amount" numeric(19,4) NOT NULL,
  "fee" numeric(19,4) DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_quote" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_quote_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_quote_account" FOREIGN KEY ("account_id")
    REFERENCES "finapp_wealth"."finapp_financial_account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_quote_instrument" FOREIGN KEY ("instrument_id")
    REFERENCES "finapp_wealth"."finapp_instrument" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_quote_side" CHECK ("side" = 'BUY'),
  CONSTRAINT "finapp_ck_quote_values" CHECK (
    "quantity" > 0 AND "unit_price" > 0 AND "estimated_amount" > 0 AND "fee" >= 0
  )
);

CREATE INDEX "finapp_idx_quote_user_expires"
  ON "finapp_trading"."finapp_quote" ("user_id", "expires_at");

GRANT SELECT, INSERT
  ON "finapp_trading"."finapp_quote"
  TO financial_platform_app;

REVOKE UPDATE, DELETE
  ON "finapp_trading"."finapp_quote"
  FROM financial_platform_app;
