CREATE TABLE "finapp_simulation"."finapp_assumption_set" (
  "id" uuid NOT NULL,
  "version_name" varchar(50) NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "asset_assumptions" jsonb NOT NULL,
  "correlation_matrix" jsonb NOT NULL,
  "effective_from" date NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "finapp_pk_assumption_set" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_uq_assumption_set_version" UNIQUE ("version_name"),
  CONSTRAINT "finapp_ck_assumption_set_status" CHECK ("status" IN ('ACTIVE', 'RETIRED'))
);

CREATE TABLE "finapp_simulation"."finapp_simulation_run" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "assumption_set_id" uuid NOT NULL,
  "engine_version" varchar(30) NOT NULL,
  "input_snapshot" jsonb NOT NULL,
  "seed" bigint NOT NULL,
  "path_count" integer DEFAULT 1000 NOT NULL,
  "duration_months" integer NOT NULL,
  "status" varchar(20) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  CONSTRAINT "finapp_pk_simulation_run" PRIMARY KEY ("id"),
  CONSTRAINT "finapp_fk_simulation_run_user" FOREIGN KEY ("user_id")
    REFERENCES "finapp_identity"."finapp_app_user" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_fk_simulation_run_assumption" FOREIGN KEY ("assumption_set_id")
    REFERENCES "finapp_simulation"."finapp_assumption_set" ("id") ON DELETE RESTRICT,
  CONSTRAINT "finapp_ck_simulation_run_values" CHECK ("path_count" > 0 AND "duration_months" BETWEEN 1 AND 600),
  CONSTRAINT "finapp_ck_simulation_run_status" CHECK ("status" IN ('RUNNING', 'COMPLETED', 'FAILED'))
);

CREATE INDEX "finapp_idx_simulation_run_user_created"
  ON "finapp_simulation"."finapp_simulation_run" ("user_id", "created_at" DESC);

CREATE TABLE "finapp_simulation"."finapp_simulation_result_summary" (
  "simulation_run_id" uuid NOT NULL,
  "goal_probability" numeric(12,8) NOT NULL,
  "final_p10" numeric(19,4) NOT NULL,
  "final_p50" numeric(19,4) NOT NULL,
  "final_p90" numeric(19,4) NOT NULL,
  "currency" varchar(3) DEFAULT 'KRW' NOT NULL,
  CONSTRAINT "finapp_pk_simulation_result_summary" PRIMARY KEY ("simulation_run_id"),
  CONSTRAINT "finapp_fk_simulation_summary_run" FOREIGN KEY ("simulation_run_id")
    REFERENCES "finapp_simulation"."finapp_simulation_run" ("id") ON DELETE CASCADE,
  CONSTRAINT "finapp_ck_sim_summary_percentiles" CHECK (
    "goal_probability" BETWEEN 0 AND 1 AND "final_p10" >= 0
    AND "final_p10" <= "final_p50" AND "final_p50" <= "final_p90"
  )
);

CREATE TABLE "finapp_simulation"."finapp_simulation_result_point" (
  "simulation_run_id" uuid NOT NULL,
  "month" integer NOT NULL,
  "p10" numeric(19,4) NOT NULL,
  "p50" numeric(19,4) NOT NULL,
  "p90" numeric(19,4) NOT NULL,
  CONSTRAINT "finapp_pk_simulation_result_point" PRIMARY KEY ("simulation_run_id", "month"),
  CONSTRAINT "finapp_fk_simulation_point_run" FOREIGN KEY ("simulation_run_id")
    REFERENCES "finapp_simulation"."finapp_simulation_run" ("id") ON DELETE CASCADE,
  CONSTRAINT "finapp_ck_sim_point_percentiles" CHECK (
    "month" BETWEEN 0 AND 600 AND "p10" >= 0 AND "p10" <= "p50" AND "p50" <= "p90"
  )
);

INSERT INTO "finapp_simulation"."finapp_assumption_set" (
  "id",
  "version_name",
  "status",
  "asset_assumptions",
  "correlation_matrix",
  "effective_from",
  "created_at"
) VALUES (
  '60000000-0000-4000-8000-000000000001',
  'SYNTHETIC_V1',
  'ACTIVE',
  '{
    "CASH": {"expectedAnnualReturn": 0.025, "annualVolatility": 0.005, "annualFee": 0.001},
    "BOND": {"expectedAnnualReturn": 0.040, "annualVolatility": 0.080, "annualFee": 0.002},
    "EQUITY": {"expectedAnnualReturn": 0.070, "annualVolatility": 0.180, "annualFee": 0.004}
  }'::jsonb,
  '[[1.0, 0.15, 0.05], [0.15, 1.0, 0.25], [0.05, 0.25, 1.0]]'::jsonb,
  '2026-09-01',
  '2026-09-01T00:00:00Z'
);

GRANT SELECT
  ON "finapp_simulation"."finapp_assumption_set"
  TO financial_platform_app;

GRANT SELECT, INSERT
  ON "finapp_simulation"."finapp_simulation_run",
     "finapp_simulation"."finapp_simulation_result_summary",
     "finapp_simulation"."finapp_simulation_result_point"
  TO financial_platform_app;

REVOKE UPDATE, DELETE
  ON "finapp_simulation"."finapp_assumption_set",
     "finapp_simulation"."finapp_simulation_run",
     "finapp_simulation"."finapp_simulation_result_summary",
     "finapp_simulation"."finapp_simulation_result_point"
  FROM financial_platform_app;
