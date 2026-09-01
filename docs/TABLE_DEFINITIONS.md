# 물리 테이블 정의서 v0

- 상태: Milestone 1~6 DDL 기준선
- 작성일: 2026-09-01
- 공통 DB 객체 prefix: `finapp_`
- 대상 DBMS: PostgreSQL 17 major

이 문서는 공용 Lightsail Managed PostgreSQL에 다른 서비스와 함께 배치될 때 이름 충돌과 권한 혼동을 방지하기 위한 물리 테이블 기준이다. Drizzle Kit versioned migration은 이 문서의 schema, table, column, constraint와 index 이름을 구현해야 한다.

## 1. 필수 Naming 규칙

### 애플리케이션 소유 객체

| 객체 | 규칙 | 예 |
|---|---|---|
| schema | `finapp_<domain>` | `finapp_trading` |
| table | `finapp_<entity>` | `finapp_trade_order` |
| primary key | `finapp_pk_<entity>` | `finapp_pk_trade_order` |
| foreign key | `finapp_fk_<child>_<parent>` | `finapp_fk_order_user` |
| unique | `finapp_uq_<entity>_<key>` | `finapp_uq_order_client_id` |
| check | `finapp_ck_<entity>_<rule>` | `finapp_ck_order_status` |
| index | `finapp_idx_<entity>_<key>` | `finapp_idx_order_user_created` |
| Drizzle history | `finapp_<service>_drizzle_migrations` | `finapp_platform_drizzle_migrations` |

규칙:

- 모든 identifier는 lowercase `snake_case`다.
- 애플리케이션이 생성하는 모든 table 이름은 예외 없이 `finapp_`로 시작한다.
- migration에서 schema-qualified table 이름을 사용하고 session `search_path`에 의존하지 않는다.
- PostgreSQL identifier 63 byte 제한을 넘지 않도록 constraint/index 이름을 축약한다.
- 기존 다른 서비스의 schema, table, sequence, index, role을 수정하거나 삭제하지 않는다.
- sequence는 사용하지 않고 UUID를 application에서 생성한다.

### Keycloak 예외

Keycloak table은 vendor migration이 관리하므로 table rename이나 prefix 주입을 시도하지 않는다.

우선순위:

1. 같은 Lightsail instance에 별도 database `finapp_keycloak` 생성
2. 별도 database가 불가능하면 공유 database의 전용 schema `finapp_keycloak` 사용
3. `financial_keycloak` role만 해당 database/schema에 권한 부여

Keycloak schema는 애플리케이션 Drizzle migration이 생성·수정·삭제하지 않는다.

## 2. Schema와 migration owner

| Schema | Owner/migration | 용도 |
|---|---|---|
| `finapp_meta` | `financial_migration` | Drizzle history와 migration metadata |
| `finapp_identity` | platform migration | 사용자와 OIDC mapping |
| `finapp_mydata` | platform migration | connection, sync, immutable raw |
| `finapp_wealth` | platform migration | 계좌, 보유자산, 거래, snapshot |
| `finapp_simulation` | platform migration | assumption과 simulation 결과 |
| `finapp_trading` | platform migration | quote, order, reservation, ledger |
| `finapp_audit` | platform migration | append-only audit/security event |
| `finapp_crypto` | platform migration | encrypted data key metadata |
| `finapp_simulator` | simulator migration | 가상 외부기관 원천 데이터 |
| `finapp_keycloak` | Keycloak vendor migration | IdP 전용; 별도 database 우선 |

Drizzle migration history:

- Platform: `finapp_meta.finapp_platform_drizzle_migrations`
- Simulator: `finapp_meta.finapp_simulator_drizzle_migrations`

두 서비스의 migration directory, Drizzle config와 history table을 분리한다. `drizzle-kit`의 기본 `__drizzle_migrations` 이름은 사용하지 않는다.

## 3. Table catalog

| Schema | Table | Milestone | Write owner |
|---|---|---:|---|
| `finapp_identity` | `finapp_app_user` | 2 | platform |
| `finapp_identity` | `finapp_oidc_identity` | 2 | platform |
| `finapp_identity` | `finapp_risk_profile` | 2 | platform |
| `finapp_mydata` | `finapp_institution_connection` | 3 | platform |
| `finapp_mydata` | `finapp_sync_job` | 3 | platform worker |
| `finapp_mydata` | `finapp_raw_batch` | 3 | platform worker |
| `finapp_mydata` | `finapp_raw_record` | 3 | platform worker, insert-only |
| `finapp_mydata` | `finapp_raw_processing_result` | 3 | platform worker |
| `finapp_wealth` | `finapp_financial_account` | 3 | platform |
| `finapp_wealth` | `finapp_instrument` | 3 | platform |
| `finapp_wealth` | `finapp_holding` | 3 | platform |
| `finapp_wealth` | `finapp_financial_transaction` | 3 | platform |
| `finapp_wealth` | `finapp_cash_account` | 3 | platform/trading |
| `finapp_wealth` | `finapp_asset_snapshot` | 3 | platform |
| `finapp_wealth` | `finapp_asset_snapshot_allocation` | 3 | platform |
| `finapp_simulation` | `finapp_assumption_set` | 4 | migration/admin seed |
| `finapp_simulation` | `finapp_simulation_run` | 4 | platform |
| `finapp_simulation` | `finapp_simulation_result_summary` | 4 | platform |
| `finapp_simulation` | `finapp_simulation_result_point` | 4 | platform |
| `finapp_trading` | `finapp_quote` | 5 | platform |
| `finapp_trading` | `finapp_idempotency_record` | 5 | platform |
| `finapp_trading` | `finapp_trade_order` | 5 | platform |
| `finapp_trading` | `finapp_fund_reservation` | 5 | platform |
| `finapp_trading` | `finapp_order_execution` | 5 | platform |
| `finapp_trading` | `finapp_cash_ledger_entry` | 5 | platform, insert-only |
| `finapp_trading` | `finapp_position` | 5 | platform |
| `finapp_trading` | `finapp_reconciliation_job` | 5 | platform worker |
| `finapp_trading` | `finapp_outbox_event` | 6 | platform worker |
| `finapp_trading` | `finapp_outbox_delivery` | 6 | platform worker, insert-only receipt |
| `finapp_audit` | `finapp_audit_event` | 3 | platform, insert-only |
| `finapp_audit` | `finapp_security_event` | 6 | platform, insert-only |
| `finapp_crypto` | `finapp_data_keyring` | 6 | platform crypto adapter |
| `finapp_simulator` | `finapp_sim_customer` | 3 | simulator |
| `finapp_simulator` | `finapp_sim_account` | 3 | simulator |
| `finapp_simulator` | `finapp_sim_instrument` | 3 | simulator |
| `finapp_simulator` | `finapp_sim_holding` | 3 | simulator |
| `finapp_simulator` | `finapp_sim_transaction` | 3 | simulator |
| `finapp_simulator` | `finapp_sim_market_price` | 3 | simulator |
| `finapp_simulator` | `finapp_sim_order` | 5 | simulator |
| `finapp_simulator` | `finapp_sim_scenario` | 3 | simulator admin |

## 4. 공통 Column 규칙

- `id uuid NOT NULL`: application-generated UUID
- `created_at timestamptz NOT NULL`: 주입된 `Clock` 기준
- `updated_at timestamptz NOT NULL`: 변경 가능한 aggregate에만 사용
- `version bigint NOT NULL DEFAULT 0`: optimistic locking 대상에만 사용
- money: `numeric(19,4)`
- quantity: `numeric(19,8)`
- hash/checksum: lowercase hex SHA-256 `char(64)`
- status/code: `varchar`와 named check constraint
- JSON: `jsonb`; 전체 payload logging 금지

`ON DELETE CASCADE`는 aggregate 내부 child에만 허용한다. user, account, order 같은 핵심 aggregate에는 기본적으로 `RESTRICT`를 사용한다.

## 5. finapp_identity

### `finapp_identity.finapp_app_user`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK `finapp_pk_app_user` |
| `status` | `varchar(20)` | N | `'ACTIVE'` | `ACTIVE`, `DISABLED` |
| `display_name` | `varchar(100)` | N | - | synthetic value |
| `dataset_version` | `varchar(50)` | N | - | 예: `FINANCIAL_APP_DATASET_V1` |
| `synthetic_data` | `boolean` | N | `true` | 항상 true check |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Checks:

- `finapp_ck_app_user_status`
- `finapp_ck_app_user_synthetic`

### `finapp_identity.finapp_oidc_identity`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK `finapp_pk_oidc_identity` |
| `user_id` | `uuid` | N | - | FK app user |
| `issuer` | `varchar(255)` | N | - | normalized issuer URI |
| `subject` | `varchar(255)` | N | - | OIDC `sub` |
| `created_at` | `timestamptz` | N | - | |

Constraints/indexes:

- `finapp_fk_oidc_identity_user`
- `finapp_uq_oidc_identity_issuer_subject` on `(issuer, subject)`
- `finapp_idx_oidc_identity_user` on `(user_id)`

### `finapp_identity.finapp_risk_profile`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `user_id` | `uuid` | N | - | PK/FK app user |
| `risk_level` | `varchar(20)` | N | - | `CONSERVATIVE`, `BALANCED`, `GROWTH` |
| `investment_horizon_months` | `integer` | N | - | 1~600 |
| `monthly_contribution` | `numeric(19,4)` | N | `0` | 0 이상 |
| `version` | `bigint` | N | `0` | optimistic lock |
| `updated_at` | `timestamptz` | N | - | |

Constraints: `finapp_fk_risk_profile_user`, `finapp_ck_risk_profile_level`, `finapp_ck_risk_profile_values`.

DEV-0012 API는 client가 전달한 `expectedVersion`과 현재 `version`이 같은 owner row만 UPDATE하고 성공 시 `version + 1`로 증가시킨다. 별도 schema/migration 변경은 없다.

## 6. finapp_mydata

### `finapp_mydata.finapp_institution_connection`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `institution_code` | `varchar(50)` | N | - | MVP `SYNTH_WEALTH_001` |
| `external_customer_id_hash` | `char(64)` | N | - | lookup/dedup hash |
| `external_customer_id_ciphertext` | `bytea` | N | - | `FAE2` wrapped-DEK envelope, plaintext 금지 |
| `encryption_key_version` | `varchar(32)` | N | - | local wrapping/KMS key version |
| `masked_external_customer_id` | `varchar(100)` | N | - | API 표시 가능 |
| `status` | `varchar(20)` | N | `'ACTIVE'` | `ACTIVE`, `REVOKED`, `EXPIRED` |
| `consent_expires_at` | `timestamptz` | N | - | |
| `last_successful_sync_at` | `timestamptz` | Y | - | |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Constraints/indexes:

- `finapp_pk_institution_connection`
- `finapp_fk_connection_user`
- `finapp_ck_connection_status`
- partial unique index `finapp_uq_connection_user_institution_active` on `(user_id, institution_code) WHERE status = 'ACTIVE'`

### `finapp_mydata.finapp_sync_job`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `connection_id` | `uuid` | N | - | FK connection |
| `status` | `varchar(24)` | N | `'QUEUED'` | sync state machine |
| `attempt` | `integer` | N | `0` | 0 이상 |
| `next_attempt_at` | `timestamptz` | Y | - | worker polling |
| `locked_at` | `timestamptz` | Y | - | |
| `locked_by` | `varchar(100)` | Y | - | worker ID |
| `error_code` | `varchar(80)` | Y | - | stable code |
| `started_at` | `timestamptz` | Y | - | |
| `completed_at` | `timestamptz` | Y | - | |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Indexes:

- `finapp_idx_sync_job_claim` on `(status, next_attempt_at, created_at)`
- `finapp_idx_sync_job_connection_created` on `(connection_id, created_at DESC)`
- partial unique `finapp_uq_sync_job_connection_active` where status is running

### `finapp_mydata.finapp_raw_batch`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `sync_job_id` | `uuid` | N | - | FK sync job |
| `resource_type` | `varchar(30)` | N | - | account/holding/transaction |
| `request_id` | `varchar(100)` | N | - | external trace |
| `schema_version` | `varchar(30)` | N | - | payload version |
| `page_cursor` | `varchar(500)` | Y | - | |
| `payload_checksum` | `char(64)` | N | - | index, not global unique |
| `received_at` | `timestamptz` | N | - | |

Indexes: `finapp_idx_raw_batch_sync`, `finapp_idx_raw_batch_checksum`.

### `finapp_mydata.finapp_raw_record`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `raw_batch_id` | `uuid` | N | - | FK raw batch |
| `resource_type` | `varchar(30)` | N | - | |
| `external_resource_id` | `varchar(200)` | N | - | synthetic external ID |
| `payload` | `jsonb` | N | - | immutable raw payload |
| `payload_checksum` | `char(64)` | N | - | |
| `received_at` | `timestamptz` | N | - | |

Constraints/indexes:

- `finapp_uq_raw_record_batch_resource` on `(raw_batch_id, resource_type, external_resource_id)`
- `finapp_idx_raw_record_checksum` on `(payload_checksum)`
- platform app role에 UPDATE/DELETE 권한을 부여하지 않는다.

### `finapp_mydata.finapp_raw_processing_result`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `raw_record_id` | `uuid` | N | - | FK raw record |
| `processor_version` | `varchar(30)` | N | - | |
| `status` | `varchar(20)` | N | - | processed/duplicate/invalid/failed |
| `derived_resource_type` | `varchar(40)` | Y | - | |
| `derived_resource_id` | `uuid` | Y | - | cross-schema FK는 사용하지 않음 |
| `error_code` | `varchar(80)` | Y | - | |
| `processed_at` | `timestamptz` | N | - | |

Unique: `finapp_uq_raw_process_record_version` on `(raw_record_id, processor_version)`.

## 7. finapp_wealth

### `finapp_wealth.finapp_financial_account`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `connection_id` | `uuid` | N | - | FK connection |
| `institution_code` | `varchar(50)` | N | - | |
| `external_account_id_hash` | `char(64)` | N | - | unique per connection |
| `masked_account_number` | `varchar(100)` | N | - | |
| `account_type` | `varchar(30)` | N | - | |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `status` | `varchar(20)` | N | `'ACTIVE'` | |
| `opened_at` | `date` | Y | - | |
| `closed_at` | `date` | Y | - | |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Unique/indexes: `finapp_uq_account_connection_external`, `finapp_idx_account_user_status`.

### `finapp_wealth.finapp_instrument`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `instrument_code` | `varchar(50)` | N | - | unique synthetic code |
| `display_name` | `varchar(150)` | N | - | |
| `asset_class` | `varchar(30)` | N | - | cash/bond/equity |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `status` | `varchar(20)` | N | `'ACTIVE'` | |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Unique: `finapp_uq_instrument_code`.

### `finapp_wealth.finapp_holding`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `account_id` | `uuid` | N | - | FK account |
| `instrument_id` | `uuid` | N | - | FK instrument |
| `external_holding_id` | `varchar(200)` | Y | - | sync source ID |
| `quantity` | `numeric(19,8)` | N | `0` | 0 이상 |
| `average_price` | `numeric(19,4)` | N | `0` | 0 이상 |
| `as_of_at` | `timestamptz` | N | - | |
| `version` | `bigint` | N | `0` | |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Unique/indexes: `finapp_uq_holding_account_instrument`, `finapp_idx_holding_user_account`.

### `finapp_wealth.finapp_financial_transaction`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `account_id` | `uuid` | N | - | FK account |
| `external_transaction_id` | `varchar(200)` | N | - | dedup key |
| `transaction_type` | `varchar(30)` | N | - | |
| `amount` | `numeric(19,4)` | N | - | signed amount 허용 |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `occurred_at` | `timestamptz` | N | - | |
| `raw_record_id` | `uuid` | Y | - | trace reference; FK 가능 |
| `created_at` | `timestamptz` | N | - | |

Unique/indexes: `finapp_uq_transaction_account_external`, `finapp_idx_transaction_user_occurred`.

### `finapp_wealth.finapp_cash_account`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `account_id` | `uuid` | N | - | FK account, unique |
| `available_balance` | `numeric(19,4)` | N | `0` | 0 이상 |
| `reserved_balance` | `numeric(19,4)` | N | `0` | 0 이상 |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `version` | `bigint` | N | `0` | lock/version |
| `updated_at` | `timestamptz` | N | - | |

Constraints: `finapp_uq_cash_account_account`, `finapp_ck_cash_account_balance`.

### `finapp_wealth.finapp_asset_snapshot`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `as_of_date` | `date` | N | - | |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `total_assets` | `numeric(19,4)` | N | - | 0 이상 |
| `cash_amount` | `numeric(19,4)` | N | - | 0 이상 |
| `investment_amount` | `numeric(19,4)` | N | - | 0 이상 |
| `created_at` | `timestamptz` | N | - | |

Unique/index: `finapp_uq_asset_snapshot_user_date`, `finapp_idx_asset_snapshot_user_date`.

### `finapp_wealth.finapp_asset_snapshot_allocation`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `snapshot_id` | `uuid` | N | - | FK snapshot, cascade delete |
| `asset_class` | `varchar(30)` | N | - | |
| `amount` | `numeric(19,4)` | N | - | 0 이상 |
| `weight` | `numeric(12,8)` | N | - | 0~1 |

Unique: `finapp_uq_snapshot_allocation_class` on `(snapshot_id, asset_class)`.

## 8. finapp_simulation

### `finapp_simulation.finapp_assumption_set`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `version_name` | `varchar(50)` | N | - | unique immutable version |
| `status` | `varchar(20)` | N | `'ACTIVE'` | |
| `asset_assumptions` | `jsonb` | N | - | returns/volatility/fee |
| `correlation_matrix` | `jsonb` | N | - | validated by application |
| `effective_from` | `date` | N | - | |
| `created_at` | `timestamptz` | N | - | |

Unique: `finapp_uq_assumption_set_version`.

### `finapp_simulation.finapp_simulation_run`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `assumption_set_id` | `uuid` | N | - | FK assumption set |
| `engine_version` | `varchar(30)` | N | - | |
| `input_snapshot` | `jsonb` | N | - | immutable request |
| `seed` | `bigint` | N | - | deterministic |
| `path_count` | `integer` | N | `1000` | 양수 |
| `duration_months` | `integer` | N | - | 1~600 |
| `status` | `varchar(20)` | N | - | running/completed/failed |
| `created_at` | `timestamptz` | N | - | |
| `completed_at` | `timestamptz` | Y | - | |

Index: `finapp_idx_simulation_run_user_created`.

### `finapp_simulation.finapp_simulation_result_summary`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `simulation_run_id` | `uuid` | N | - | PK/FK run, cascade delete |
| `goal_probability` | `numeric(12,8)` | N | - | 0~1 |
| `final_p10` | `numeric(19,4)` | N | - | |
| `final_p50` | `numeric(19,4)` | N | - | |
| `final_p90` | `numeric(19,4)` | N | - | |
| `currency` | `varchar(3)` | N | `'KRW'` | |

Check: `finapp_ck_sim_summary_percentiles`.

### `finapp_simulation.finapp_simulation_result_point`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `simulation_run_id` | `uuid` | N | - | FK run, cascade delete |
| `month` | `integer` | N | - | 0~600 |
| `p10` | `numeric(19,4)` | N | - | |
| `p50` | `numeric(19,4)` | N | - | |
| `p90` | `numeric(19,4)` | N | - | |

Primary key: `finapp_pk_simulation_result_point` on `(simulation_run_id, month)`. Check: `finapp_ck_sim_point_percentiles`.

## 9. finapp_trading

### `finapp_trading.finapp_quote`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `account_id` | `uuid` | N | - | FK account |
| `instrument_id` | `uuid` | N | - | FK instrument |
| `side` | `varchar(10)` | N | `'BUY'` | MVP BUY only |
| `quantity` | `numeric(19,8)` | N | - | 양수 |
| `unit_price` | `numeric(19,4)` | N | - | 양수 |
| `estimated_amount` | `numeric(19,4)` | N | - | 양수 |
| `fee` | `numeric(19,4)` | N | `0` | 0 이상 |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `expires_at` | `timestamptz` | N | - | |
| `created_at` | `timestamptz` | N | - | |

Index: `finapp_idx_quote_user_expires`.

### `finapp_trading.finapp_idempotency_record`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `operation` | `varchar(50)` | N | - | |
| `idempotency_key` | `uuid` | N | - | client header |
| `request_hash` | `char(64)` | N | - | canonical request hash |
| `resource_type` | `varchar(40)` | Y | - | |
| `resource_id` | `uuid` | Y | - | |
| `response_status` | `integer` | Y | - | |
| `response_snapshot` | `jsonb` | Y | - | redacted response |
| `created_at` | `timestamptz` | N | - | |
| `expires_at` | `timestamptz` | N | - | retention |

Unique: `finapp_uq_idempotency_user_operation_key`.

### `finapp_trading.finapp_trade_order`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `account_id` | `uuid` | N | - | FK account |
| `instrument_id` | `uuid` | N | - | FK instrument |
| `quote_id` | `uuid` | N | - | FK quote |
| `client_order_id` | `uuid` | N | - | simulator idempotency |
| `side` | `varchar(10)` | N | `'BUY'` | |
| `quantity` | `numeric(19,8)` | N | - | 양수 |
| `estimated_amount` | `numeric(19,4)` | N | - | 양수 |
| `currency` | `varchar(3)` | N | `'KRW'` | |
| `status` | `varchar(30)` | N | `'PENDING_SUBMISSION'` | order state machine |
| `external_order_id` | `varchar(100)` | Y | - | simulator ID |
| `version` | `bigint` | N | `0` | |
| `created_at` | `timestamptz` | N | - | |
| `updated_at` | `timestamptz` | N | - | |

Unique/indexes: `finapp_uq_order_client_id`, `finapp_idx_order_user_created`, `finapp_idx_order_status_updated`.

### `finapp_trading.finapp_fund_reservation`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `order_id` | `uuid` | N | - | FK order |
| `cash_account_id` | `uuid` | N | - | FK cash account |
| `amount` | `numeric(19,4)` | N | - | 양수 |
| `status` | `varchar(20)` | N | `'ACTIVE'` | active/released/settled/expired |
| `expires_at` | `timestamptz` | N | - | |
| `created_at` | `timestamptz` | N | - | |
| `released_at` | `timestamptz` | Y | - | |
| `settled_at` | `timestamptz` | Y | - | |

Partial unique: `finapp_uq_reservation_order_active`.

### `finapp_trading.finapp_order_execution`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `order_id` | `uuid` | N | - | FK order |
| `external_execution_id` | `varchar(100)` | N | - | unique |
| `quantity` | `numeric(19,8)` | N | - | 양수 |
| `unit_price` | `numeric(19,4)` | N | - | 양수 |
| `amount` | `numeric(19,4)` | N | - | 양수 |
| `executed_at` | `timestamptz` | N | - | |
| `created_at` | `timestamptz` | N | - | |

Unique: `finapp_uq_execution_external`, `finapp_uq_execution_order` for MVP full fill.

### `finapp_trading.finapp_cash_ledger_entry`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `cash_account_id` | `uuid` | N | - | FK cash account |
| `order_id` | `uuid` | N | - | FK order |
| `entry_type` | `varchar(30)` | N | - | reserve/release/settle |
| `amount` | `numeric(19,4)` | N | - | signed amount |
| `balance_after` | `numeric(19,4)` | N | - | 0 이상 |
| `occurred_at` | `timestamptz` | N | - | |

Unique: `finapp_uq_ledger_order_entry_type`. App role에 UPDATE/DELETE 권한을 부여하지 않는다.

### `finapp_trading.finapp_position`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `user_id` | `uuid` | N | - | FK app user |
| `account_id` | `uuid` | N | - | FK account |
| `instrument_id` | `uuid` | N | - | FK instrument |
| `quantity` | `numeric(19,8)` | N | `0` | 0 이상 |
| `average_price` | `numeric(19,4)` | N | `0` | 0 이상 |
| `version` | `bigint` | N | `0` | |
| `updated_at` | `timestamptz` | N | - | |

Unique: `finapp_uq_position_account_instrument`.

### `finapp_trading.finapp_reconciliation_job`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `order_id` | `uuid` | N | - | FK order |
| `status` | `varchar(20)` | N | `'QUEUED'` | |
| `attempt` | `integer` | N | `0` | |
| `next_attempt_at` | `timestamptz` | N | - | |
| `locked_at` | `timestamptz` | Y | - | |
| `locked_by` | `varchar(100)` | Y | - | |
| `last_error_code` | `varchar(80)` | Y | - | |
| `created_at` | `timestamptz` | N | - | |
| `completed_at` | `timestamptz` | Y | - | |

Indexes: `finapp_idx_reconcile_claim`, partial unique `finapp_uq_reconcile_order_active`.

### `finapp_trading.finapp_outbox_event` — Milestone 6

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK/event ID |
| `aggregate_type` | `varchar(50)` | N | - | |
| `aggregate_id` | `uuid` | N | - | |
| `event_type` | `varchar(80)` | N | - | |
| `payload` | `jsonb` | N | - | redacted |
| `status` | `varchar(20)` | N | `'PENDING'` | |
| `attempt` | `integer` | N | `0` | |
| `available_at` | `timestamptz` | N | - | |
| `locked_at` | `timestamptz` | Y | - | bounded worker lease |
| `locked_by` | `varchar(100)` | Y | - | claim owner |
| `last_error_code` | `varchar(80)` | Y | - | stable internal code only |
| `processed_at` | `timestamptz` | Y | - | |
| `created_at` | `timestamptz` | N | - | |

Constraints/indexes: `finapp_uq_outbox_aggregate_event`, `finapp_ck_outbox_attempt`, `finapp_ck_outbox_status`, `finapp_idx_outbox_status_available`.

### `finapp_trading.finapp_outbox_delivery` — Milestone 6

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `event_id` | `uuid` | N | - | FK → outbox event |
| `consumer_name` | `varchar(100)` | N | - | stable local consumer identity |
| `delivered_at` | `timestamptz` | N | `now()` | |

`(event_id, consumer_name)` unique receipt가 publish 성공 뒤 outbox complete 전에 process가 종료되는 crash window의 중복 효과를 막는다. Runtime role은 INSERT/SELECT만 허용한다.

## 10. finapp_audit와 finapp_crypto

### `finapp_audit.finapp_audit_event`

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `occurred_at` | `timestamptz` | N | - | |
| `user_id` | `uuid` | Y | - | login failure는 null 가능 |
| `action` | `varchar(80)` | N | - | |
| `resource_type` | `varchar(50)` | Y | - | |
| `resource_id` | `uuid` | Y | - | |
| `result` | `varchar(20)` | N | - | success/failure |
| `reason_code` | `varchar(80)` | Y | - | |
| `trace_id` | `varchar(100)` | N | - | |
| `metadata` | `jsonb` | N | `'{}'` | allowlist only |

Indexes: `finapp_idx_audit_user_time`, `finapp_idx_audit_action_time`. App role에 UPDATE/DELETE 권한을 부여하지 않는다.

### `finapp_audit.finapp_security_event` — Milestone 6

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `occurred_at` | `timestamptz` | N | - | |
| `user_id` | `uuid` | Y | - | FK, pre-auth failure는 null |
| `event_type` | `varchar(80)` | N | - | authn/authz/suspicious allowlist |
| `result` | `varchar(20)` | N | - | success/failure |
| `reason_code` | `varchar(80)` | N | - | stable internal code |
| `trace_id` | `varchar(100)` | N | - | |
| `source_ip_hash` | `varchar(64)` | Y | - | raw IP 금지, keyed HMAC |
| `metadata` | `jsonb` | N | `'{}'` | allowlist only |

Constraints/indexes: `finapp_ck_security_event_type`, `finapp_ck_security_event_result`, `finapp_idx_security_event_type_time`, `finapp_idx_security_event_source_time`. Runtime role은 SELECT/INSERT만 가능하고 UPDATE/DELETE는 거부한다.

### `finapp_crypto.finapp_data_keyring` — Milestone 6

| Column | Type | Null | Default | Key/Rule |
|---|---|---:|---|---|
| `id` | `uuid` | N | - | PK |
| `scope_type` | `varchar(30)` | N | - | user/data group |
| `scope_id` | `uuid` | N | - | |
| `encrypted_data_key` | `bytea` | N | - | KMS encrypted DEK |
| `kms_key_id` | `varchar(255)` | N | - | ARN/config value |
| `key_version` | `varchar(32)` | N | - | |
| `algorithm` | `varchar(30)` | N | - | AES-256-GCM |
| `status` | `varchar(20)` | N | `'ACTIVE'` | |
| `created_at` | `timestamptz` | N | - | |
| `retired_at` | `timestamptz` | Y | - | |

Unique: `finapp_uq_keyring_scope_version`.

## 11. finapp_simulator

Simulator table은 모두 `finapp_simulator` schema에 있고 platform schema와 FK를 갖지 않는다.

### `finapp_simulator.finapp_sim_customer`

- `id uuid` PK
- `external_customer_id varchar(100)` unique
- `preset varchar(40)`
- `display_name varchar(100)`
- `seed bigint`
- `dataset_version varchar(50)`
- `created_at timestamptz`

### `finapp_simulator.finapp_sim_account`

- `id uuid` PK
- `customer_id uuid` FK sim customer
- `external_account_id varchar(100)`
- `masked_account_number varchar(100)`
- `account_type varchar(30)`
- `currency varchar(3)`
- `cash_balance numeric(19,4)`
- `status varchar(20)`
- `created_at`, `updated_at timestamptz`
- unique `finapp_uq_sim_account_customer_external`

### `finapp_simulator.finapp_sim_instrument`

- `id uuid` PK
- `instrument_code varchar(50)` unique
- `display_name varchar(150)`
- `asset_class varchar(30)`
- `currency varchar(3)`
- `status varchar(20)`

### `finapp_simulator.finapp_sim_holding`

- `id uuid` PK
- `account_id uuid` FK sim account
- `instrument_id uuid` FK sim instrument
- `external_holding_id varchar(100)`
- `quantity numeric(19,8)`
- `average_price numeric(19,4)`
- `as_of_at timestamptz`
- unique `finapp_uq_sim_holding_account_instrument`

### `finapp_simulator.finapp_sim_transaction`

- `id uuid` PK
- `account_id uuid` FK sim account
- `external_transaction_id varchar(100)`
- `transaction_type varchar(30)`
- `amount numeric(19,4)`
- `currency varchar(3)`
- `occurred_at timestamptz`
- unique `finapp_uq_sim_transaction_account_external`

### `finapp_simulator.finapp_sim_market_price`

- `id uuid` PK
- `instrument_id uuid` FK sim instrument
- `price numeric(19,4)` positive
- `currency varchar(3)`
- `as_of_at timestamptz`
- unique `finapp_uq_sim_price_instrument_time`
- index `finapp_idx_sim_price_instrument_time`

### `finapp_simulator.finapp_sim_order`

- `id uuid` PK
- `client_order_id uuid` unique
- `external_order_id varchar(100)` unique
- `request_hash char(64)`
- `account_id uuid` FK sim account
- `instrument_id uuid` FK sim instrument
- `side varchar(10)` BUY only
- `quantity numeric(19,8)`
- `unit_price numeric(19,4)` nullable until fill
- `status varchar(30)`
- `scenario_mode varchar(50)`
- `created_at`, `updated_at timestamptz`
- `filled_at timestamptz` nullable
- index `finapp_idx_sim_order_status_updated`

### `finapp_simulator.finapp_sim_scenario`

- `id uuid` PK
- `scope_type varchar(30)`
- `scope_key varchar(100)`
- `mode varchar(50)`
- `config jsonb`
- `updated_at timestamptz`
- unique `finapp_uq_sim_scenario_scope`

## 12. 권한 기준

### `financial_platform_app`

- USAGE: platform schema만
- DML: platform table의 필요한 SELECT/INSERT/UPDATE
- 금지: DDL, `finapp_simulator`, Keycloak schema
- `finapp_raw_record`, ledger, audit event UPDATE/DELETE 금지

### `financial_simulator_app`

- USAGE/DML: `finapp_simulator`만
- 금지: 모든 platform schema, Keycloak schema, DDL

### `financial_migration`

- `finapp_*` application schema DDL
- 다른 서비스 schema/database 접근 금지
- Keycloak vendor schema migration 금지

### `financial_keycloak`

- 별도 `finapp_keycloak` database 또는 schema만 사용
- application schema 접근 금지

## 13. Drizzle migration과 공용 DB 안전장치

- shared/demo/production DB에서 `drizzle-kit push`를 사용하지 않는다.
- versioned SQL migration은 신규 `finapp_*` schema와 명시된 객체만 대상으로 한다.
- migration에 unqualified `DROP`, `ALTER`, `TRUNCATE`를 사용하지 않는다.
- destructive SQL은 원칙적으로 금지하고 expand/migrate/contract 순서를 사용한다.
- 원격 최초 migration 전 `finapp_` 객체 목록, owner, privilege를 기록한다.
- 기존 `finapp_` 객체가 예상 migration history와 다르면 자동 진행하지 않는다.

prefix 위반 확인 SQL:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN (
    'finapp_meta',
    'finapp_identity',
    'finapp_mydata',
    'finapp_wealth',
    'finapp_simulation',
    'finapp_trading',
    'finapp_audit',
    'finapp_crypto',
    'finapp_simulator'
)
AND table_type = 'BASE TABLE'
AND table_name NOT LIKE 'finapp\_%' ESCAPE E'\\';
```

결과는 반드시 0행이어야 한다.

애플리케이션 schema 밖에 잘못 생성된 table 확인 SQL:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name LIKE 'finapp\_%' ESCAPE E'\\'
AND table_schema NOT LIKE 'finapp\_%' ESCAPE E'\\';
```

Keycloak vendor table은 위 검사 대상에서 제외하고 database/schema 격리 여부를 별도로 확인한다.
