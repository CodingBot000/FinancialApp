CREATE TABLE "finapp_trading"."finapp_outbox_event" (
  "id" uuid NOT NULL,
  "aggregate_type" varchar(50) NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "event_type" varchar(80) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
  "attempt" integer DEFAULT 0 NOT NULL,
  "available_at" timestamptz NOT NULL,
  "locked_at" timestamptz,
  "locked_by" varchar(100),
  "last_error_code" varchar(80),
  "processed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_outbox_event" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_uq_outbox_aggregate_event" UNIQUE ("aggregate_type", "aggregate_id", "event_type"),
  CONSTRAINT "finapp_ck_outbox_attempt" CHECK ("attempt" >= 0),
  CONSTRAINT "finapp_ck_outbox_status" CHECK ("status" IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'))
);
CREATE INDEX "finapp_idx_outbox_status_available" ON "finapp_trading"."finapp_outbox_event" ("status", "available_at", "created_at");

CREATE TABLE "finapp_trading"."finapp_outbox_delivery" (
  "id" uuid NOT NULL,
  "event_id" uuid NOT NULL,
  "consumer_name" varchar(100) NOT NULL,
  "delivered_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_outbox_delivery" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_outbox_delivery_event" FOREIGN KEY ("event_id") REFERENCES "finapp_trading"."finapp_outbox_event" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_outbox_delivery_event_consumer" UNIQUE ("event_id", "consumer_name")
);

GRANT SELECT, INSERT, UPDATE ON "finapp_trading"."finapp_outbox_event" TO financial_platform_app;
GRANT SELECT, INSERT ON "finapp_trading"."finapp_outbox_delivery" TO financial_platform_app;
REVOKE DELETE ON "finapp_trading"."finapp_outbox_event", "finapp_trading"."finapp_outbox_delivery" FROM financial_platform_app;
REVOKE UPDATE ON "finapp_trading"."finapp_outbox_delivery" FROM financial_platform_app;
