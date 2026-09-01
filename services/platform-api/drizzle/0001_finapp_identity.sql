CREATE TABLE "finapp_identity"."finapp_app_user" (
  "id" uuid NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "display_name" varchar(100) NOT NULL,
  "dataset_version" varchar(50) NOT NULL,
  "synthetic_data" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_app_user" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_ck_app_user_status" CHECK ("status" IN ('ACTIVE', 'DISABLED')),
  CONSTRAINT "finapp_ck_app_user_synthetic" CHECK ("synthetic_data" = true)
);

CREATE TABLE "finapp_identity"."finapp_oidc_identity" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "issuer" varchar(255) NOT NULL,
  "subject" varchar(255) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_oidc_identity" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_oidc_identity_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_uq_oidc_identity_issuer_subject" UNIQUE ("issuer", "subject")
);

CREATE INDEX "finapp_idx_oidc_identity_user"
  ON "finapp_identity"."finapp_oidc_identity" ("user_id");

CREATE TABLE "finapp_identity"."finapp_risk_profile" (
  "user_id" uuid NOT NULL,
  "risk_level" varchar(20) DEFAULT 'BALANCED' NOT NULL,
  "investment_horizon_months" integer DEFAULT 120 NOT NULL,
  "monthly_contribution" numeric(19,4) DEFAULT 0 NOT NULL,
  "version" bigint DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_risk_profile" PRIMARY KEY ("user_id"),
  CONSTRAINT "finapp_fk_risk_profile_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_risk_profile_level"
    CHECK ("risk_level" IN ('CONSERVATIVE', 'BALANCED', 'GROWTH')),
  CONSTRAINT "finapp_ck_risk_profile_values"
    CHECK ("investment_horizon_months" BETWEEN 1 AND 600 AND "monthly_contribution" >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON "finapp_identity"."finapp_app_user",
     "finapp_identity"."finapp_oidc_identity",
     "finapp_identity"."finapp_risk_profile"
  TO financial_platform_app;
