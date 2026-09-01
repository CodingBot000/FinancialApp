CREATE TABLE "finapp_audit"."finapp_security_event" (
  "id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "user_id" uuid,
  "event_type" varchar(80) NOT NULL,
  "result" varchar(20) NOT NULL,
  "reason_code" varchar(80) NOT NULL,
  "trace_id" varchar(100) NOT NULL,
  "source_ip_hash" varchar(64),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "finapp_pk_security_event" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_security_event_user" FOREIGN KEY ("user_id") REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_security_event_type" CHECK ("event_type" IN ('AUTHENTICATION_FAILURE', 'AUTHORIZATION_FAILURE', 'SUSPICIOUS_REQUEST')),
  CONSTRAINT "finapp_ck_security_event_result" CHECK ("result" IN ('SUCCESS', 'FAILURE'))
);
CREATE INDEX "finapp_idx_security_event_type_time" ON "finapp_audit"."finapp_security_event" ("event_type", "occurred_at");
CREATE INDEX "finapp_idx_security_event_source_time" ON "finapp_audit"."finapp_security_event" ("source_ip_hash", "occurred_at");

GRANT SELECT, INSERT ON "finapp_audit"."finapp_security_event" TO financial_platform_app;
REVOKE UPDATE, DELETE ON "finapp_audit"."finapp_security_event" FROM financial_platform_app;
