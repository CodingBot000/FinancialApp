CREATE SCHEMA IF NOT EXISTS "finapp_market";
--> statement-breakpoint
CREATE TABLE "finapp_market"."finapp_market_instrument" (
	"id" uuid NOT NULL,
	"symbol" varchar(12) NOT NULL,
	"name" varchar(120) NOT NULL,
	"market" varchar(20) NOT NULL,
	"industry" varchar(200),
	"standard_code" varchar(32),
	"base_price" numeric(19, 4),
	"listed_at" date,
	"active" boolean DEFAULT true NOT NULL,
	"source" varchar(20) NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finapp_pk_market_instrument" PRIMARY KEY("id"),
	CONSTRAINT "finapp_uq_market_instrument_symbol" UNIQUE("symbol"),
	CONSTRAINT "finapp_ck_market_instrument_market" CHECK ("market" IN ('KOSPI', 'KOSDAQ')),
	CONSTRAINT "finapp_ck_market_instrument_source" CHECK ("source" = 'KIS_MASTER')
);
--> statement-breakpoint
CREATE INDEX "finapp_idx_market_instrument_name"
	ON "finapp_market"."finapp_market_instrument" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "finapp_idx_market_instrument_market_symbol"
	ON "finapp_market"."finapp_market_instrument" USING btree ("market", "symbol");
--> statement-breakpoint
CREATE TABLE "finapp_market"."finapp_market_quote_snapshot" (
	"id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"current_price" numeric(19, 4) NOT NULL,
	"change_price" numeric(19, 4) NOT NULL,
	"change_rate" numeric(10, 4) NOT NULL,
	"volume" bigint NOT NULL,
	"source" varchar(20) NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "finapp_pk_market_quote_snapshot" PRIMARY KEY("id"),
	CONSTRAINT "finapp_fk_market_quote_instrument" FOREIGN KEY ("instrument_id") REFERENCES "finapp_market"."finapp_market_instrument"("id") ON DELETE restrict,
	CONSTRAINT "finapp_ck_market_quote_source" CHECK ("source" IN ('KIS', 'LOCAL')),
	CONSTRAINT "finapp_ck_market_quote_values" CHECK ("current_price" > 0 AND "volume" >= 0)
);
--> statement-breakpoint
CREATE INDEX "finapp_idx_market_quote_instrument_captured"
	ON "finapp_market"."finapp_market_quote_snapshot" USING btree ("instrument_id", "captured_at");
--> statement-breakpoint
CREATE TABLE "finapp_market"."finapp_market_price_bar" (
	"id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"interval" varchar(20) NOT NULL,
	"bucket_at" timestamp with time zone NOT NULL,
	"open" numeric(19, 4) NOT NULL,
	"high" numeric(19, 4) NOT NULL,
	"low" numeric(19, 4) NOT NULL,
	"close" numeric(19, 4) NOT NULL,
	"volume" bigint NOT NULL,
	"source" varchar(20) NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "finapp_pk_market_price_bar" PRIMARY KEY("id"),
	CONSTRAINT "finapp_fk_market_bar_instrument" FOREIGN KEY ("instrument_id") REFERENCES "finapp_market"."finapp_market_instrument"("id") ON DELETE restrict,
	CONSTRAINT "finapp_uq_market_bar_bucket" UNIQUE("instrument_id", "interval", "bucket_at"),
	CONSTRAINT "finapp_ck_market_bar_interval" CHECK ("interval" IN ('MINUTE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
	CONSTRAINT "finapp_ck_market_bar_source" CHECK ("source" IN ('KIS', 'LOCAL')),
	CONSTRAINT "finapp_ck_market_bar_ohlc" CHECK ("high" >= "low" AND "volume" >= 0)
);
--> statement-breakpoint
CREATE INDEX "finapp_idx_market_bar_lookup"
	ON "finapp_market"."finapp_market_price_bar" USING btree ("instrument_id", "interval", "bucket_at");
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'financial_platform_app') THEN
		EXECUTE 'GRANT USAGE ON SCHEMA "finapp_market" TO "financial_platform_app"';
		EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "finapp_market"."finapp_market_instrument", "finapp_market"."finapp_market_quote_snapshot", "finapp_market"."finapp_market_price_bar" TO "financial_platform_app"';
		EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA "finapp_market" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "financial_platform_app"';
	END IF;
END $$;
