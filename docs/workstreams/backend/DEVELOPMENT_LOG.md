# Backend Workstream 개발 로그

- 기록 방식: append-only
- 다음 ID: `BE-0016`
- 운영 상태: `codex/backend`는 DEV-0006 통합 이력으로 보존, 신규 BE commit은 단일 `main`에서 수행
- 활성 worktree: `/Users/switch/Development/Web/FinancialApp`
- 통합 검토 기준: `main` at `2574ad0`, `platform-v1` at BE-0008, `institution-simulator-v1` at BE-0003
- migration owner: 단일 main 작업자가 BE 단계마다 기록

기존 BE-0001~BE-0008 항목의 base/contract revision은 분리 당시 사실로 보존한다. BE-0009 이후에는 `INTEGRATED_DEVELOPMENT_PLAN.md`에 따라 `main`의 `services/**`, `infra/**`, OpenAPI와 migration 변경을 commit 단위로 기록하고 중앙 상태·issue도 같은 단계에서 갱신한다.

## BE-0001 — Drizzle migration과 로컬 인프라 격리 기준선

- 날짜: 2026-09-01
- Milestone: 1
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1`, `institution-simulator-v1` (health trace headers 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): establish isolated database baseline [BE-0001]`

### 완료

- `codex/backend`와 별도 backend worktree에서만 작업했다.
- 두 서비스에 Drizzle ORM/Kit, PostgreSQL driver와 service별 migration runner/config/directory를 추가했다.
- history를 `finapp_meta.finapp_platform_drizzle_migrations`와 `finapp_meta.finapp_simulator_drizzle_migrations`로 분리했다.
- 모든 platform/simulator application schema와 생성된 table/index/constraint를 검사하는 PostgreSQL 17 Testcontainers migration test를 추가했다.
- local PostgreSQL role/schema bootstrap으로 migration/platform/simulator/Keycloak 권한을 분리하고 runtime role의 교차 schema 접근과 DDL을 차단했다.
- PostgreSQL 17.6, Keycloak 26.7.3, 두 NestJS/Fastify service와 migration tool profile을 포함하는 Compose를 추가했다.
- 요청/상관 ID를 Fastify lifecycle에서 수락·생성·응답 전파하고 health OpenAPI 계약에 반영했다.
- dependency-cruiser로 cycle, layer 역방향과 platform/simulator source 교차 import를 차단했다.

### 변경 파일

- `services/platform-api/**`
- `services/institution-simulator/**`
- `infra/database/**`, `infra/docker/**`, `infra/keycloak/**`
- `contracts/openapi/platform-v1.yaml`, `contracts/openapi/institution-simulator-v1.yaml`
- `package-lock.json` (backend branch-local dependency 재생성)
- `docs/workstreams/backend/**`

### 검증

- 명령: Node `v24.19.0`, npm `11.17.0`에서 두 workspace lint/typecheck/dependency-cruiser/Vitest/build
- 결과: platform 4 tests, simulator 3 tests 통과; 실제 PostgreSQL 17.6 Testcontainers migration/history/prefix/role isolation 포함
- 명령: Redocly OpenAPI lint와 contract fixture validation
- 결과: 두 canonical contract와 기존 frontend health fixture 통과
- 명령: 두 production Docker image build
- 결과: Node 24.19.0 image에서 build 성공, runtime dependency audit vulnerability 0
- 명령: clean Compose bootstrap, 두 service migration profile, health/Keycloak discovery/role catalog query
- 결과: history table 각 1 migration, prefix 위반 0, platform→simulator와 simulator→platform schema privilege 모두 false, runtime role database CREATE 모두 false
- 명령: formatter, secret scan, `git diff --check`
- 결과: 통과

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0000` baseline / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: Drizzle Kit build-time transitive moderate advisory. runtime image 영향 없음, upstream stable 갱신 필요.
- Handoff: health 응답의 `X-Request-Id`, `X-Correlation-Id` canonical contract가 BE-0001에서 추가됨.

### 다음 작업

- BE-0002: identity schema, `jose` remote JWKS guard, scope/ownership baseline과 `/api/v1/me` 구현

## BE-0002 — OIDC resource server와 내부 사용자 provisioning

- 날짜: 2026-09-01
- Milestone: 2
- 상태: COMPLETED
- base commit: `241ac06` (`BE-0001`)
- contract revision: `platform-v1` (`GET /api/v1/me`와 auth problem response 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): add OIDC identity boundary [BE-0002]`

### 완료

- `finapp_identity.finapp_app_user`, `finapp_oidc_identity`, `finapp_risk_profile` Drizzle schema와 forward-only migration을 추가했다.
- 모든 PK/FK/unique/check/index를 명시적인 `finapp_` 이름으로 생성하고 platform runtime role에 identity table DML만 부여했다.
- `jose` remote JWKS를 사용하는 Nest guard에서 signature, issuer, audience, expiration/not-before와 endpoint scope를 검증한다.
- 인증 실패를 token 원문이나 JOSE 내부 오류 없이 `AUTH_TOKEN_INVALID`/`AUTH_SCOPE_MISSING` problem response와 trace ID로 변환한다.
- 검증된 OIDC `(issuer, subject)`를 내부 user UUID에 idempotent하게 매핑하고 합성 기본 risk profile을 같은 transaction에서 생성한다.
- `/api/v1/me`가 Drizzle row 대신 명시적인 application response model을 반환한다.
- Keycloak realm에 PKCE S256 mobile client, platform audience와 MVP scope 5개를 선언하고 Compose API에 issuer/audience/internal JWKS 설정을 연결했다.

### 변경 파일

- `services/platform-api/src/core/auth/**`, `src/core/database/**`
- `services/platform-api/src/modules/identity/**`
- `services/platform-api/src/database/schema.ts`
- `services/platform-api/drizzle/0001_finapp_identity.sql`, migration journal
- `services/platform-api/test/identity/**`, migration integration test
- `infra/keycloak/finapp-realm.json`, `infra/docker/compose.yaml`
- `contracts/openapi/platform-v1.yaml`
- `package-lock.json`, `services/platform-api/package.json`
- `docs/workstreams/backend/DEVELOPMENT_LOG.md`

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 3 test files / 11 tests 통과. 실제 RSA/JWT와 HTTP JWKS로 token 없음, wrong issuer, wrong audience, expired, missing scope, valid `/me`를 검증했다.
- 명령: PostgreSQL 17.6 Testcontainers migration/repository test
- 결과: migration 2개 적용, identity table 3개와 prefix 검사 통과, 동일 OIDC subject 반복 provisioning 결과 user/identity/profile 각 1행
- 명령: root `npm run verify` (Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과
- 명령: platform production Docker image build
- 결과: Node 24.19.0 build 성공, runtime 145 package audit vulnerability 0
- 명령: clean Compose migration/catalog/Keycloak discovery와 admin catalog 확인
- 결과: history 2, prefix 위반 constraint 0, PKCE `S256`, platform audience scope와 `financial.read/write`, `simulation.execute`, `order.execute`, `scenario.admin` import 확인

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0001_finapp_identity` / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. Drizzle Kit은 build-time only이며 production image audit은 0이다.
- Handoff: frontend는 `GET /api/v1/me`의 canonical response와 `AUTH_TOKEN_INVALID`/`AUTH_SCOPE_MISSING` 계약을 BE-0002 revision으로 소비해야 한다.

### 다음 작업

- BE-0003: simulator source schema, deterministic `BALANCED_WORKER` seed와 account/holding/transaction HTTP API 구현

## BE-0003 — 결정적 institution simulator 원천 데이터

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `db374e1` (`BE-0002`)
- contract revision: `institution-simulator-v1` (account/holding/transaction 조회 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): add deterministic simulator data [BE-0003]`

### 완료

- `finapp_simulator`에 customer, account, instrument, holding, transaction Drizzle schema와 forward-only migration을 추가했다.
- 모든 table, index, PK/FK/unique/check constraint를 명시적인 `finapp_` 이름으로 생성했다.
- 합성 persona `BALANCED_WORKER`의 고정 UUID, 외부 식별자, 금액, 시점과 dataset version을 사용하는 멱등 seed CLI를 추가했다.
- 동일 seed를 반복 실행해도 customer/account/instrument/holding/transaction이 각각 한 행만 유지된다.
- simulator runtime role에는 simulator schema의 DML만 부여하고 database DDL 및 platform schema 접근을 차단했다.
- customer 외부 식별자로 account, holding, transaction을 조회하는 세 개의 MyData simulator API와 canonical OpenAPI response를 구현했다.

### 변경 파일

- `services/institution-simulator/src/core/database/**`
- `services/institution-simulator/src/modules/account/**`
- `services/institution-simulator/src/database/schema.ts`, `seed-cli.ts`
- `services/institution-simulator/drizzle/0001_finapp_simulator_source.sql`, migration journal
- `services/institution-simulator/test/account/**`, migration integration test
- `infra/docker/compose.yaml`
- `contracts/openapi/institution-simulator-v1.yaml`
- `docs/workstreams/backend/**`

### 검증

- 명령: simulator lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 3 test files / 7 tests 통과. PostgreSQL 17.6 Testcontainers migration, prefix, role isolation과 seed 멱등성 검증 포함
- 명령: root `npm run verify` (Node 24.19.0, Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과; 전체 7 test files / 20 tests 통과
- 명령: simulator production Docker image build
- 결과: Node 24.19.0 build 성공, runtime 144 package audit vulnerability 0
- 명령: clean Compose migration 및 동일 seed 2회, API/catalog/role query
- 결과: simulator history 2, source table 5, 각 seed entity 1행, prefix 위반 relation/constraint 0, runtime database CREATE와 wealth schema USAGE 모두 false; 세 API의 결정적 응답 확인

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0001_finapp_simulator_source` / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. build-time only이며 simulator production image audit은 0이다.
- 신규 backend issue/gap: 없음.
- Handoff: frontend/platform은 `SYNTH-CUSTOMER-A`에 대한 세 simulator endpoint의 `simulator-v1` canonical response를 BE-0003 revision으로 소비할 수 있다.

### 다음 작업

- BE-0004: platform MyData connection/raw/sync/normalization과 asset summary API 구현

## BE-0004 — 합성 MyData 수집과 자산 정규화

- 날짜: 2026-09-02
- Milestone: 3
- 상태: COMPLETED
- base commit: `f3ff499` (`BE-0003`)
- contract revision: `platform-v1` (MyData connection/sync와 wealth 조회 API 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): ingest synthetic account data [BE-0004]`

### 완료

- `finapp_mydata` connection/sync/raw batch/raw record/processing result와 `finapp_wealth` account/instrument/holding/transaction/cash/snapshot/allocation Drizzle schema 및 forward-only migration을 추가했다.
- 모든 table/index/PK/FK/unique/check 이름을 `finapp_`로 생성하고 runtime role이 simulator schema를 직접 읽지 못하도록 유지했다.
- 합성 customer identifier를 AES-256-GCM ciphertext와 HMAC lookup hash로 분리하고 API에는 masked 값만 노출한다.
- manual sync의 활성 job 중복 생성을 partial unique index와 repository race 처리로 방지하고 상태를 `QUEUED → FETCHING → RAW_STORED → NORMALIZING → COMPLETED|FAILED`로 전이한다.
- simulator account/holding/transaction을 HTTP로만 수집하고 canonical SHA-256 checksum과 함께 새 raw batch/record로 매번 보존한다.
- raw record별 processing result와 derived resource ID를 기록하고 외부 key upsert로 account/holding/transaction을 정규화한다.
- 같은 payload 재동기화에서 raw 이력은 누적하지만 파생 transaction은 한 행만 유지하며 서버에서 cash, investment, total과 allocation snapshot을 계산한다.
- connection/sync API와 asset summary, accounts/detail, holdings, transactions, history API에 scope와 ownership 조건을 적용하고 canonical OpenAPI 계약을 추가했다.
- Compose bootstrap의 MyData default DML grant를 제거하고 raw batch/record/processing result의 UPDATE/DELETE를 migration에서 명시적으로 revoke했다.

### 변경 파일

- `services/platform-api/src/modules/mydata/**`
- `services/platform-api/src/modules/wealth/**`
- `services/platform-api/src/database/schema.ts`, `src/app.module.ts`
- `services/platform-api/drizzle/0002_finapp_mydata_wealth.sql`, migration journal
- `services/platform-api/test/database/**`, `test/identity/**`, `test/mydata/**`
- `infra/database/init/002-finapp-schemas.sql`, `infra/docker/**`
- `contracts/openapi/platform-v1.yaml`
- `docs/workstreams/backend/**`

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 4 test files / 19 tests 통과. 실제 PostgreSQL 17.6 migration, active sync dedup, 동일 dataset 2회 raw/derived 처리, raw immutable 권한, 정상/500/malformed/timeout HTTP adapter와 auth scope 포함
- 명령: root `npm run verify` (Node 24.19.0, Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과; 전체 8 test files / 28 tests 통과
- 명령: platform production Docker image build
- 결과: Node 24.19.0 build 성공, runtime 145 package audit vulnerability 0
- 명령: clean Compose에서 두 migration, simulator seed와 실제 simulator HTTP sync 2회, catalog/role query
- 결과: platform history 3, MyData table 5, wealth table 7, prefix 위반 relation/constraint 0; raw/processing 각 6행과 derived transaction 1행; raw UPDATE/DELETE false, simulator schema USAGE false
- 명령: asset summary query
- 결과: total `185400000.0000` = cash `15400000.0000` + investments `170000000.0000`, CASH/EQUITY allocation과 last sync 확인

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0002_finapp_mydata_wealth` / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. build-time only이며 platform production image audit은 0이다.
- `BE-GAP-0001`: scheduled sync, stale worker lease 회수와 retry backoff는 manual sync vertical slice 다음 단계로 연기했다.
- Handoff: frontend는 BE-0004 `platform-v1`의 connection/sync polling, summary/account/holding/transaction/history 계약을 소비할 수 있다. full external identifier는 계약에 포함되지 않는다.

### 다음 작업

- BE-0005: scheduled sync claim, stale lease recovery, retry/backoff와 fault 상태 검증

## BE-0005 — scheduled sync와 lease 복구

- 날짜: 2026-09-02
- Milestone: 3
- 상태: COMPLETED
- base commit: `e649979` (`BE-0004`)
- contract revision: `platform-v1` at BE-0004 (변경 없음)
- migration owner: backend session; schema/migration 변경 없음
- commit: `feat(be): recover scheduled sync workers [BE-0005]`

### 완료

- Nest lifecycle 기반 scheduler가 활성 consent connection을 주기적으로 찾아 sync job을 생성하고 due job을 batch 단위로 실행한다.
- `QUEUED` job claim은 status와 `next_attempt_at` 조건을 포함한 단일 UPDATE로 수행해 여러 node가 경쟁해도 한 worker만 성공한다.
- institution timeout/HTTP 오류는 같은 job을 `QUEUED`로 재예약하고 `next_attempt_at` backoff와 안정적인 `MYDATA_INSTITUTION_SYNC_FAILED` 코드를 기록한다.
- 최대 attempt 도달 시 job을 `FAILED`로 종결하며 성공하면 이전 오류와 lock/retry 정보를 제거한다.
- `FETCHING`, `RAW_STORED`, `NORMALIZING` 상태의 만료된 `locked_at` lease를 회수해 재예약하거나 최대 attempt에서 `MYDATA_SYNC_LEASE_EXPIRED`로 실패시킨다.
- scheduler tick 중첩을 process 내부에서 차단하고 DB startup/migration 전 일시적 query 실패는 다음 tick에서 재시도한다.
- Compose platform profile에 scheduler tick, schedule interval, lease, retry, max attempt와 batch 설정을 명시했다.

### 변경 파일

- `services/platform-api/src/modules/mydata/application/mydata-scheduler.service.ts`
- `services/platform-api/src/modules/mydata/application/mydata.service.ts`, repository port
- `services/platform-api/src/modules/mydata/infrastructure/persistence/drizzle-mydata.repository.ts`
- `services/platform-api/src/modules/mydata/mydata.module.ts`
- `services/platform-api/test/database/**`, `test/mydata/**`
- `infra/docker/compose.yaml`
- `docs/workstreams/backend/**`

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 5 test files / 21 tests 통과. 두 worker 동시 claim에서 한 개만 성공, active/scheduled dedup, retry→FAILED, stale lease→retry, scheduler orchestration 포함
- 명령: root `npm run verify` (Node 24.19.0, Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과; 전체 9 test files / 30 tests 통과
- 명령: platform production Docker image build
- 결과: Node 24.19.0 build 성공. runtime dependency layer는 BE-0004와 동일한 145 package/audit vulnerability 0 결과를 재사용했다.
- 명령: clean Compose scheduled sync smoke
- 결과: connection만 생성한 뒤 scheduler 첫 claim에서 attempt 1, `COMPLETED`, raw 3, derived transaction 1 확인
- 명령: simulator stop/start fault smoke
- 결과: stop 중 `QUEUED:1:MYDATA_INSTITUTION_SYNC_FAILED`, 재시작 후 `COMPLETED:2:none`으로 backoff 복구 확인

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: BE-0004 local migration 유지 / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음.
- `BE-GAP-0001`: RESOLVED. scheduled claim, stale lease, retry/backoff와 max attempt가 자동/Compose 검증을 통과했다.
- 신규 backend issue/gap과 contract handoff: 없음.

### 다음 작업

- BE-0006: versioned assumption set과 deterministic Monte Carlo simulation API 구현

## BE-0006 — 버전 고정 합성 Monte Carlo 시뮬레이션

- 날짜: 2026-09-02
- Milestone: 4
- 상태: COMPLETED
- base commit: `462f6f8` (`BE-0005`)
- contract revision: `platform-v1` (simulation 실행/조회와 결과 model 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): persist deterministic simulations [BE-0006]`

### 완료

- `finapp_simulation`에 assumption set, simulation run, result summary와 monthly result point Drizzle schema 및 forward-only migration을 추가했다.
- 모든 table/index/PK/FK/unique/check와 migration history의 `finapp_` 접두사를 유지하고 assumption/run/result runtime UPDATE/DELETE 권한을 제거했다.
- migration에 immutable `SYNTHETIC_V1` 가정 세트를 고정 UUID와 유효일로 저장하고 CASH/BOND/EQUITY 수익률·변동성·수수료·상관행렬을 버전 관리한다.
- engine `1.0.0`에서 seeded PRNG, Box-Muller 정규분포와 Cholesky 상관 변환을 사용해 같은 input/seed/assumption/path count의 결과를 재현한다.
- 월별 재조정 수익률과 contribution을 1~600개월에 적용하고 p10/p50/p90 series와 최종 목표 달성 확률을 계산한다.
- client seed 주입을 금지하고 서버 seed, input snapshot, engine/assumption version, path count와 전체 결과를 transaction으로 보존한다.
- 금액 상한, allocation 자산군/중복/weight 합, duration과 path count를 검증하며 사용자 소유 simulation만 조회한다.
- `POST /api/v1/simulations`, `GET /api/v1/simulations/{simulationId}`에 `simulation.execute` scope, stable validation/not-found problem과 기술 시연 disclaimer를 적용했다.
- 합성 가정, 계산식, 재현성 규칙과 알려진 한계를 backend 소유 `SIMULATION_MODEL.md`에 기록했다.

### 변경 파일

- `services/platform-api/src/modules/simulation/**`
- `services/platform-api/src/database/schema.ts`, `src/app.module.ts`
- `services/platform-api/drizzle/0003_finapp_simulation.sql`, migration journal
- `services/platform-api/test/database/**`, `test/identity/**`, `test/simulation/**`
- `contracts/openapi/platform-v1.yaml`
- `docs/workstreams/backend/**`

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 7 test files / 34 tests 통과. 결정성, percentile 순서, contribution/target 성질, 입력 검증, ownership, JWT scope와 PostgreSQL persistence/immutable 권한을 포함한다.
- 명령: engine 최대 허용 기간 benchmark와 performance test
- 결과: 1,000 paths × 600개월 계산 602ms, 601 points와 전체 percentile 순서 정상; 자동 성능 기준 3초 이내 통과
- 명령: root `npm run verify` (Node 24.19.0, Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과; 전체 11 test files / 43 tests 통과
- 명령: platform production Docker image build 및 workspace runtime audit
- 결과: Node 24.19.0 image build 성공, platform production dependency vulnerability 0
- 명령: clean Compose platform migration, 실제 repository create/get와 catalog/role query
- 결과: platform history 4, simulation table 4, assumption/run/summary 각 1행, monthly point 121행, engine `1.0.0`/assumption `SYNTHETIC_V1`, prefix 위반 relation/constraint 0, 미검증 constraint 0, assumption/run UPDATE/DELETE 모두 false

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0003_finapp_simulation` / `SYNTHETIC_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. build-time only이며 platform production workspace audit은 0이다.
- 신규 backend issue/gap: 없음.
- Handoff: frontend는 BE-0006 `platform-v1`의 simulation 실행/조회 계약을 소비할 수 있다. 결과는 기술 시연용 합성 계산이며 disclaimer를 함께 표시해야 한다.
- Handoff: integration owner는 필요하면 backend 소유 `docs/workstreams/backend/SIMULATION_MODEL.md`를 canonical `docs/SIMULATION_MODEL.md`로 승격할 수 있다.

### 다음 작업

- BE-0007: quote 조회, 주문 idempotency와 cash reservation을 포함하는 거래 vertical slice 구현

## BE-0007 — 소유권 보호 합성 BUY quote preview

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- base commit: `f4effb4` (`BE-0006`)
- contract revision: `platform-v1` (`POST /api/v1/orders/preview`와 quote model 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): persist synthetic buy quotes [BE-0007]`

### 완료

- `finapp_trading.finapp_quote` Drizzle schema와 forward-only migration을 추가하고 PK/FK/check/index를 명시적인 `finapp_` 이름으로 생성했다.
- quote runtime 권한을 SELECT/INSERT로 제한하고 UPDATE/DELETE를 명시적으로 revoke해 preview 결과를 immutable하게 유지했다.
- `POST /api/v1/orders/preview`가 `order.execute` scope를 검사하고 검증된 OIDC subject를 내부 user로 매핑한다.
- account, holding과 instrument를 user ownership 조건으로 함께 조회해 다른 사용자 또는 유효하지 않은 조합은 동일한 404로 감춘다.
- MVP `BUY`, UUID, 0보다 큰 최대 8자리 소수 quantity와 금액 범위를 검증한다.
- 합성 동기화 holding의 단가로 60초 quote를 만들고 quantity × unit price를 BigInt fixed-decimal로 계산해 부동소수점 오차를 제거했다.
- API에는 명시적 quote view만 반환하며 `syntheticQuote: true`와 canonical 4/8자리 decimal 형식을 보장한다.

### 변경 파일

- `services/platform-api/src/modules/trading/**`
- `services/platform-api/src/database/schema.ts`, `src/app.module.ts`
- `services/platform-api/drizzle/0004_finapp_quote.sql`, migration journal
- `services/platform-api/test/database/**`, `test/identity/**`, `test/trading/**`
- `contracts/openapi/platform-v1.yaml`
- `docs/workstreams/backend/**`

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 8 test files / 43 tests 통과. invalid quantity/SELL, ownership 404, JWT scope, exact decimal, PostgreSQL 저장과 immutable 권한을 포함한다.
- 명령: root `npm run verify` (Node 24.19.0, Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과; 전체 12 test files / 52 tests 통과
- 명령: platform production Docker image build 및 workspace runtime audit
- 결과: Node 24.19.0 image build 성공, production dependency vulnerability 0
- 명령: clean Compose migration, runtime-role quote create와 catalog/role query
- 결과: platform history 5, quote 1행, `3.00000000 × 125000.0000 = 375000.0000`, prefix 위반 relation/constraint 0, 미검증 constraint 0, quote UPDATE/DELETE 모두 false

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0004_finapp_quote` / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. build-time only이며 platform production workspace audit은 0이다.
- `BE-GAP-0002`: 주문 idempotency, row-lock cash reservation과 external submission은 quote와 transaction 경계를 분리하기 위해 BE-0008로 이동했다.
- Handoff: frontend는 BE-0007 `platform-v1`의 immutable synthetic quote preview를 소비할 수 있다. quote는 60초 후 만료된다.

### 다음 작업

- BE-0008: idempotency record, trade order와 row-lock cash reservation transaction 구현

## BE-0008 — 멱등 주문 준비와 row-lock 현금 예약

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- base commit: `04d22e1` (`BE-0007`)
- contract revision: `platform-v1` (`POST /api/v1/orders` PENDING_SUBMISSION 준비 응답 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): reserve order funds idempotently [BE-0008]`

### 완료

- `finapp_trading`에 idempotency record, trade order와 fund reservation Drizzle schema 및 forward-only migration을 추가했다.
- 모든 table/index/PK/FK/unique/check 이름을 `finapp_`로 생성하고 idempotency record의 UPDATE/DELETE와 order/reservation DELETE를 runtime role에서 제거했다.
- `POST /api/v1/orders`가 필수 UUID `Idempotency-Key`, `order.execute`, ownership, quote payload 일치와 만료를 검증한다.
- quantity를 canonical 8자리 decimal로 정규화한 ordered payload의 SHA-256 request hash를 저장한다.
- 동일 사용자/operation/key에 PostgreSQL transaction advisory lock을 잡고 같은 hash는 기존 response snapshot을 `200`으로 반환하며 다른 hash는 `409 IDEMPOTENCY_CONFLICT`로 거절한다.
- quote와 연결된 cash account를 `FOR UPDATE`로 잠그고 available balance를 검증한 뒤 available 감소, reserved 증가, order, active reservation과 idempotency response를 한 transaction으로 commit한다.
- 부족한 현금은 `INSUFFICIENT_FUNDS`, 만료 quote는 `QUOTE_EXPIRED`, 다른 사용자 resource는 존재를 숨기는 404로 반환한다.
- 주문은 `PENDING_SUBMISSION`과 `202`로 반환한다. simulator 외부 호출은 이 local transaction이 commit된 뒤 별도 BE 단계에서 수행해 DB lock 동안 HTTP를 호출하지 않는다.
- idempotency retention은 24시간, active fund reservation 만료는 15분으로 고정했다.

### 변경 파일

- `services/platform-api/src/modules/trading/**`
- `services/platform-api/src/database/schema.ts`
- `services/platform-api/drizzle/0005_finapp_order_reservation.sql`, migration journal
- `services/platform-api/test/database/**`, `test/identity/**`, `test/trading/**`
- `contracts/openapi/platform-v1.yaml`
- `docs/workstreams/backend/**`

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest, Nest build
- 결과: 8 test files / 46 tests 통과. canonical hash, domain error, HTTP key/scope와 실제 PostgreSQL idempotency/concurrency 불변조건을 포함한다.
- 명령: PostgreSQL 17.6 Testcontainers concurrency
- 결과: 동일 key 20개 동시 요청에서 created 1개/기존 결과 19개와 order/reservation/idempotency 각 1행; 1,540만 원에서 800만 원 주문 두 개 중 하나만 추가 예약되어 available `7275000.0000`, reserved `8125000.0000`, 합계 보존과 음수 잔액 없음
- 명령: root `npm run verify` (Node 24.19.0, Colima socket 명시)
- 결과: formatter, OpenAPI/fixture, Expo dependency, secret scan, 전체 lint/typecheck/test/build 통과; 전체 12 test files / 55 tests 통과
- 명령: platform production Docker image build 및 workspace runtime audit
- 결과: Node 24.19.0 image build 성공, production dependency vulnerability 0
- 명령: clean Compose migration, runtime-role 100만 원 동시 주문과 catalog/role query
- 결과: 80만 원 주문 두 개 중 prepared/insufficient 각 1개, 이어서 12.5만 원 동일 key 20개에서 주문 1개만 생성; 최종 available `75000.0000`, reserved `925000.0000`, order/reservation/idempotency 각 2행, history 6, prefix 위반 relation/constraint 0, 미검증 constraint 0, idempotency UPDATE/DELETE와 order DELETE false

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0005_finapp_order_reservation` / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. build-time only이며 platform production workspace audit은 0이다.
- `BE-GAP-0002`: RESOLVED. 멱등 재사용/충돌과 row-lock cash reservation concurrency 조건을 자동·Compose 검증했다.
- 신규 backend issue/gap: 없음.
- Handoff: frontend는 최초 주문 준비 `202 PENDING_SUBMISSION`, 동일 key replay `200`, `IDEMPOTENCY_CONFLICT`/`QUOTE_EXPIRED`/`INSUFFICIENT_FUNDS`를 BE-0008 contract로 처리해야 한다. 주문 POST는 자동 retry하지 않는다.

### 다음 작업

- BE-0009: simulator brokerage submit, FILLED/REJECTED settlement와 UNKNOWN reconciliation 구현

## BE-0009 — Simulator 거래·Scenario 경계

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- base commit: `a8ee092` (`DEV-0010`)
- contract revision: `institution-simulator-v1` (market 3, brokerage 2, admin 2 operation 추가), `platform-v1` quote provider 구현 변경 없음
- migration owner: 단일 main backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): add simulator brokerage scenarios [BE-0009]`

### 완료

- `finapp_simulator`에 market price, brokerage order와 global scenario Drizzle schema 및 forward-only `0002_finapp_simulator_trading` migration을 추가했다.
- deterministic market/history와 NORMAL/TIMEOUT/HTTP_500/MALFORMED_RESPONSE/ORDER_REJECT/ORDER_UNKNOWN_THEN_FILLED를 실제 Fastify route로 구현했다.
- brokerage POST는 PostgreSQL advisory lock과 request hash로 같은 `clientOrderId`/payload를 단일 주문으로 만들고 다른 payload를 conflict로 거절한다.
- UNKNOWN 주문은 client order status 첫 조회에서 동일 external order의 FILLED 결과로 전이하며 fixed-decimal amount를 저장한다.
- local/test admin reset은 주문을 지우고 계좌·시세·scenario를 합성 기준선으로 reseed한다. production admin 요청은 404이고 repository 상태를 변경하지 않는다.
- platform quote preview에 simulator market price HTTP adapter를 연결했다. GET timeout만 적용하고 자동 retry하지 않으며 HTTP 호출은 quote insert와 DB transaction 밖에서 끝난다.
- canonical OpenAPI, operation coverage, compatibility baseline과 success fixture를 7개 operation에 맞춰 함께 갱신했다.

### 변경 파일

- `services/institution-simulator/src/modules/{market,scenario,trading}/**`, `src/database/**`
- `services/institution-simulator/drizzle/0002_finapp_simulator_trading.sql`, migration journal
- `services/institution-simulator/test/{database,trading}/**`
- `services/platform-api/src/modules/trading/**`, `services/platform-api/test/{database,identity,trading}/**`
- `contracts/openapi/institution-simulator-v1.yaml`, `contracts/{operation-coverage,fixtures,openapi/compatibility-baseline}*`
- `apps/mobile/{package.json,app.json}`, root `package-lock.json` (resolved `ISSUE-0004` Expo compatible patch)
- 중앙 상태·계획·issue와 backend workstream 문서

### 검증

- 명령: 두 backend lint, strict typecheck, dependency-cruiser와 Nest build
- 결과: simulator 42 modules/93 dependencies, platform 69 modules/174 dependencies, 위반 0; 두 build 통과
- 명령: canonical `contract:check`
- 결과: OpenAPI lint와 27 operations/30 fixtures/controller/provider/consumer/compatibility gate 통과
- 명령: PostgreSQL 17.6 Testcontainers 전체 service test
- 결과: simulator 4 files/12 tests, platform 9 files/51 tests 통과. seed 2회, prefix/role, 10-way idempotency, payload conflict, UNKNOWN→FILLED와 HTTP timeout/malformed/500을 포함한다.
- 명령: simulator production Docker image build
- 결과: Node 24.19.0 build 성공, runtime 144 package audit vulnerability 0
- 명령: clean Compose simulator migration, seed 2회와 actual HTTP smoke
- 결과: market price, canonical 400, 신규 201 UNKNOWN, status FILLED, 동일 payload 200 replay, reset NORMAL 통과. 검증용 container/network/volume은 종료 후 제거했다.
- 명령: root `npm audit --json`
- 결과: 기존 등록 항목 moderate 18, high 0, critical 0; Expo 14와 Drizzle 개발도구 4이며 신규 advisory 없음
- 명령: root `npm run verify` 최초 실행
- 결과: Expo expected patch drift로 dependency gate가 실패해 중앙 `ISSUE-0004`를 등록했다. Node 24 workspace에서 SDK 57 compatible patch 8개와 SecureStore config plugin을 적용했고 강제 audit fix는 사용하지 않았다.
- 명령: local Colima socket을 명시한 최종 root `npm run verify`
- 결과: formatter, 27-operation contract, Expo dependency, secret, architecture, lint, typecheck, mobile 60 + simulator 12 + platform 51 = 총 123 tests와 두 backend build 통과

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0002_finapp_simulator_trading` / `FINANCIAL_APP_DATASET_V1`
- 결과: 원격 endpoint/credential 검토, 연결, catalog, migration, seed와 배포 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. Drizzle Kit build-time only이며 simulator production runtime audit은 0이다.
- 중앙 `GAP-0005`: RESOLVED. simulator provider boundary와 actual HTTP 복구 조건을 자동·Compose 검증했다.
- 중앙 `ISSUE-0004`: RESOLVED. Expo SDK 57 patch 호환성 gate를 복구했다.
- 신규 backend issue/gap: 없음.
- Handoff: BE-0010은 market GET과 brokerage POST/status를 DB transaction 밖에서 호출하고 POST 자동 retry를 금지한다. frontend consumer는 BE-0010/FE-0014에서 연결한다.

### 다음 작업

- BE-0010: platform external submit, settlement, reconciliation, order 조회와 append-only 최소 audit 구현

## BE-0010 — Platform Settlement·Reconciliation·Audit

- 날짜: 2026-09-02
- Milestone: 3, 4, 5
- 상태: COMPLETED
- base commit: `fbe96c8` (`BE-0009`)
- contract revision: `platform-v1` order GET/list와 developer scenario/reset, 총 31 operations
- migration owner: 단일 main backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): settle and reconcile synthetic orders [BE-0010]`

### 완료

- reservation commit 후 simulator brokerage POST를 단 한 번 호출하고 HTTP timeout/5xx/malformed를 자동 retry 없이 UNKNOWN으로 저장한다.
- FILLED는 order, active reservation, cash, execution, weighted-average position, immutable ledger와 audit를 한 transaction에서 settlement한다.
- REJECTED와 reconciliation 최대 실패는 예약금을 반환하고 RELEASE ledger를 남기며 cash available+reserved 불변조건을 유지한다.
- reconciliation job에 SKIP LOCKED claim, lease recovery, attempt/backoff/max-attempt와 duplicate settlement advisory lock을 구현했다.
- owner-scoped order 단건/목록 API, 200 current-state replay, 201 final과 202 UNKNOWN 응답을 canonical 계약에 추가했다.
- append-only audit table/module에 MyData connection/sync, simulation, order lifecycle와 developer scenario action을 trace/allowlist metadata로 기록한다.
- local/demo developer proxy를 simulator admin API에 연결하고 production AppModule에는 DeveloperModule을 등록하지 않는다.
- clean local Compose 실제 흐름을 재현하는 `npm run smoke:local-order`를 추가했다.

### 변경 파일

- `services/platform-api/src/modules/{trading,audit,developer,mydata,simulation}/**`
- `services/platform-api/src/database/schema.ts`, `drizzle/0006_finapp_settlement_audit.sql`, journal
- `services/platform-api/test/{database,trading,developer,identity,simulation}/**`
- `contracts/openapi/platform-v1.yaml`, operation coverage, fixtures와 compatibility baseline
- `scripts/smoke-local-order-flow.mjs`, root package script, Compose worker 환경
- 중앙 상태·계획·API/table/security/test/issue와 backend workstream 문서

### 검증

- 명령: platform lint, strict typecheck, dependency-cruiser, Vitest와 Nest build
- 결과: 80 modules/216 dependencies, 위반 0; 12 test files/61 tests와 build 통과
- 명령: canonical `contract:check`
- 결과: 두 OpenAPI lint와 31 operations/34 fixtures/controller/provider/consumer/compatibility gate 통과
- 명령: PostgreSQL 17.6 Testcontainers settlement/concurrency
- 결과: 두 worker claim 중 하나, duplicate settlement 1회, execution 2, ledger 8, position `3.00000000`, audit 13; 정상/reject/UNKNOWN→FILLED/max-failure와 총 cash 감소 `375000.0000` 검증
- 명령: 두 production Docker image build와 runtime audit
- 결과: platform 145/simulator 144 runtime package, vulnerability 0; 기존 Drizzle build-time moderate 4만 재현
- 명령: clean Compose migration/seed와 `npm run smoke:local-order`
- 결과: platform history 7/simulator 3, prefix 위반 relation/constraint 0. actual JWT sync→NORMAL FILLED→ORDER_REJECT REJECTED→UNKNOWN reconciliation FILLED→reset 200 통과
- 명령: Compose runtime role catalog
- 결과: audit/ledger UPDATE·DELETE 모두 false; 최종 smoke audit에 connection/sync/order created/submitted/reconciled/filled와 `DEV_SCENARIO_CHANGED` 4건 확인
- 명령: local Colima socket을 명시한 root `npm run verify`
- 결과: formatter, 31-operation contract, Expo dependency, secret, architecture, lint, strict typecheck, mobile 60 + simulator 12 + platform 61 = 총 133 tests와 두 backend build 통과

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0006_finapp_settlement_audit` / `FINANCIAL_APP_DATASET_V1`
- 결과: 원격 DB 사전 검토, endpoint/credential 요청, 연결, catalog, migration, seed와 배포 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: 변화 없음. build-time only이며 production runtime audit은 0이다.
- 중앙 `GAP-0006`: RESOLVED. 최소 append-only audit action/권한/redaction 조건을 충족했다.
- 중앙 `ISSUE-0005`: RESOLVED. body 없는 simulator reset POST의 JSON content-type defect를 actual HTTP test와 Compose에서 수정·검증했다.
- 중앙 `ISSUE-0006`: RESOLVED. 주문 목록 cursor를 `(created_at, id)` 복합 keyset으로 수정하고 timestamp 동률 pagination을 검증했다.
- 중앙 `ISSUE-0007`: RESOLVED. developer action에 실제 요청 correlation ID를 전달하고 E2E로 검증했다.
- 신규 active backend issue/gap: 없음.
- Handoff: FE-0013은 POST 자동 retry 없이 201 FILLED/REJECTED, 202 UNKNOWN과 GET polling을 처리한다. FE-0014는 local/demo developer route만 노출한다.

### 다음 작업

- 통합 순서 `FE-0010`: live OIDC `/me` mobile adapter; 다음 backend ID는 Milestone 6A의 `BE-0011`

## BE-0011 — FE-0013 주문 진입 계약 보강

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- base commit: `43634b2f37bca2630622ab34dc1e454c30527710`
- contract revision: additive `platform-v1` Holding instrument ID
- migration owner: schema/migration 변경 없음
- 예정 commit: `fix(be): expose order instrument identity [BE-0011]`

### 완료

- mobile이 DB를 추측하지 않고 BUY preview 요청을 만들 수 있도록 Holding response에 불투명 UUID `instrumentId`를 additive required property로 추가
- PostgreSQL wealth repository, domain view, canonical OpenAPI/fixture/provider mock과 mobile strict consumer fixture를 동기화
- Drizzle query wrapper 내부의 PostgreSQL `23505`를 bounded cause-chain으로 식별해 duplicate connection을 domain conflict와 canonical 409로 복구
- repeatable local smoke가 existing connection을 재사용하고 각 사용자 주문 action마다 새 UUID idempotency key를 사용하도록 보강

### 검증

- canonical 31 operations/34 fixtures/controller/provider/consumer/compatibility gate 통과
- provider Fastify E2E 13 tests 통과
- PostgreSQL 17.6 Testcontainers 8 tests: duplicate connection domain conflict와 holding instrument UUID 포함
- 실제 보존 local DB duplicate POST 409 `MYDATA_CONNECTION_ALREADY_EXISTS`, sync/simulation/FILLED/REJECTED/UNKNOWN→FILLED smoke 통과
- Colima socket을 명시한 root `npm run verify`: formatter, 31 operation/34 fixture 계약, architecture, lint, strict typecheck, mobile 82/simulator 12/platform 61 총 155 tests와 두 backend build 통과

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: DB 변경 없음 / `FINANCIAL_APP_DATASET_V1`
- 결과: 원격 DB 사전 검토, endpoint/credential 요청, 연결, catalog, migration, seed와 배포 모두 미실행

### 이슈·누락·Handoff

- 중앙 `GAP-0008`: RESOLVED
- 중앙 `ISSUE-0009`: RESOLVED
- FE-0013은 holding의 `instrumentId`를 그대로 preview/order payload에 사용하고 code→ID 추측을 금지한다.

### 다음 작업

- 통합 순서 `FE-0013`: BUY order와 UNKNOWN recovery mobile vertical slice

## BE-0012 — Settlement Transactional Outbox와 Idempotent Publisher

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- base commit: `0e05a511224e198ae6447e14b2f3f16932c8fa7c`
- contract revision: HTTP API 변경 없음
- migration owner: single main / local 및 Testcontainers만 적용
- 예정 commit: `feat(be): add transactional settlement outbox [BE-0012]`

### 완료

- FILLED/REJECTED/최대 reconciliation FAILED의 order/cash/position/audit settlement transaction에 redacted `ORDER_SETTLED` insert를 포함했다.
- `finapp_outbox_event`에 status/attempt/available/lease/error/processed 상태와 aggregate event unique, claim index를 구현했다.
- `finapp_outbox_delivery`의 event/consumer unique receipt로 publish 성공 뒤 complete 전 종료 시 재claim을 durable `DUPLICATE` 성공으로 수렴시켰다.
- Nest worker는 `SKIP LOCKED`, stale lease, bounded backoff/max attempt를 사용하며 외부 HTTP나 장시간 transaction을 포함하지 않는다.

### 검증

- platform architecture/lint/strict typecheck와 outbox scheduler 3 tests 통과
- PostgreSQL 17.6 Testcontainers migration 8 tests: terminal event 4건, redaction, 2-worker distinct claim, stale crash-window duplicate receipt 1건, processed 4건
- local Compose forward migration과 actual OIDC/business smoke: FILLED/REJECTED/UNKNOWN→FILLED 후 outbox processed/delivery 각 3건
- `make smoke-test`는 platform host build를 선행하며 재실행 통과
- root formatter/contract/secret/architecture/lint/typecheck, mobile 95/simulator 12/platform 64 총 171 tests와 두 backend build 통과

### 원격 DB

- 사용 여부: 사용하지 않음
- migration revision/dataset: local/Testcontainers `0007_finapp_outbox` / `FINANCIAL_APP_DATASET_V1`
- 결과: 원격 사전 검토, endpoint/credential 요청, 연결, catalog, migration, seed와 배포 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0004`, `BE-ISSUE-0005`, 중앙 `ISSUE-0012` RESOLVED
- `BE-ISSUE-0001` build-time advisory는 변화 없으며 단계 10 dependency slice에서 재평가한다.

### 다음 작업

- `BE-0013`: local DataKeyProvider/AWS KMS adapter boundary와 wrong AAD test

## BE-0013 — Local Envelope Crypto와 AWS KMS Adapter Boundary

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- base commit: `b18c40f5b167041e1331b32356ccd21e19b15d46`
- contract revision: HTTP API/DB migration 변경 없음; ciphertext envelope revision `FAE2`
- migration owner: schema/migration 변경 없음, local/Testcontainers만 검증
- 예정 commit: `feat(be): harden data key provider boundary [BE-0013]`

### 완료

- application `DataKeyProvider` port와 local/AWS KMS infrastructure adapter를 분리했다.
- local provider는 random DEK를 local KEK로 wrapping하고 owner/schema/table/column/scope AAD, stable HMAC lookup을 사용한다.
- sensitive adapter는 wrapped DEK와 field IV/tag/ciphertext를 `FAE2` envelope로 저장하고 plaintext DEK를 use-after zero-fill한다.
- AWS adapter는 SDK 비종속 client port에 GenerateDataKey/Decrypt/encryption context와 별도 HMAC GenerateMac을 매핑한다.
- local provider와 legacy pre-envelope read는 demo/production에서 fail-closed한다.

### 검증

- crypto 관련 4 tests: roundtrip/plaintext 비노출, wrong AAD/tamper, legacy local-only, production 차단, fake AWS KMS mapping/MAC
- 관련 MyData/OIDC 19 tests와 PostgreSQL 17.6 Testcontainers migration 8 tests 통과
- 보존 local Compose actual OIDC/business smoke가 기존 합성 ciphertext read와 sync/simulation/order/outbox 3/3을 통과
- root formatter/contract/secret/architecture/lint/typecheck, mobile 95/simulator 12/platform 68 총 175 tests와 두 backend build 통과
- 실제 AWS endpoint, SDK client, credential과 KMS key는 사용하지 않음

### 원격 DB

- 사용 여부: 사용하지 않음
- migration revision/dataset: DB 변경 없음 / `FINANCIAL_APP_DATASET_V1`
- 결과: 원격 사전 검토, endpoint/credential 요청, 연결, catalog, migration, seed와 배포 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0006` RESOLVED
- AWS SDK binding/key policy/실제 KMS roundtrip은 현재 실행 제외인 Milestone 6B에서 새 승인을 받아 수행한다.

### 다음 작업

- `BE-0014`: security event, structured log/redaction와 production developer bootstrap 검증

## BE-0014 — Security Event, Structured Log와 Production Isolation

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- base commit: `e1adec8f5564f4cec03222d7c82f5db11d490281`
- contract revision: HTTP response 변경 없음 / migration `0008_finapp_security_event`
- migration owner: single main, local/Testcontainers only
- 예정 commit: `feat(be): add security event observability [BE-0014]`

### 완료

- `finapp_security_event`와 type/result check, type/source time index, runtime SELECT/INSERT-only 권한을 추가했다.
- OIDC guard가 missing/invalid token과 missing scope를 stable reason으로 기록하되 token/subject/raw IP를 저장하지 않는다.
- source IP는 별도 32-byte local HMAC key로 hash하고 security metadata는 숫자/boolean allowlist만 허용한다.
- HTTP completion log는 query-free path와 8개 allowlist field만 JSON line으로 출력한다.
- production AppModule actual bootstrap에서 developer controller/provider/route가 없고 POST가 404임을 검증했다.

### 검증

- platform architecture/lint/strict typecheck, non-integration 62 tests 통과
- PostgreSQL 17.6 Testcontainers migration 9 tests: hashed source, metadata rejection, prefix와 security event UPDATE/DELETE false
- local Compose forward migration 뒤 invalid-token security event 1건, structured JSON log와 secret keyword 0, 12단계 actual smoke 통과
- root formatter/contract/secret/architecture/lint/typecheck, mobile 95/simulator 12/platform 71 총 178 tests와 두 backend build 통과
- 원격 DB와 원격 배포는 사용하지 않음

### 이슈·누락·Handoff

- `BE-ISSUE-0007` RESOLVED
- 실제 운영 log collector/SIEM 연동은 원격 배포 범위이며 현재 local JSON stdout까지 검증했다.

### 다음 작업

- `BE-0015`: readiness/metrics와 external HTTP circuit breaker

## BE-0015 — Readiness, Metrics와 External Circuit Breaker

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- base commit: `f0f3abef80d9739d94b2ad78ddb3ca2b03010535`
- contract revision: additive health readiness/metrics와 quote 503 / DB migration 없음
- migration owner: single main, schema 변경 없음, local/Testcontainers only
- 예정 commit: `feat(be): harden readiness and external resilience [BE-0015]`

### 완료

- application runtime DB `SELECT 1`에 bounded timeout을 둔 readiness 200/503와 private monitoring용 process-local metrics를 추가했다.
- HTTP/5xx/external failure/circuit open·reject counter와 PostgreSQL pool gauge를 고정 JSON allowlist로 노출했다.
- MyData, market price와 brokerage simulator adapter에 closed/open/half-open circuit breaker와 single half-open probe를 추가했다.
- market circuit open은 quote preview의 canonical 503으로 변환하고 brokerage 주문 POST는 retry하지 않으며 open 상태에서 전송하지 않는다.
- canonical OpenAPI, operation coverage, success fixture와 compatibility baseline을 additive하게 갱신했다.

### 검증

- contract 33 operations/36 fixtures, platform architecture/lint/strict typecheck 통과
- Colima Testcontainers PostgreSQL을 포함한 platform 16 files/77 tests 통과
- root verify: mobile 95/simulator 12/platform 77 총 184 tests와 두 backend build 통과
- actual Compose rebuild/migration/seed 뒤 readiness `200 ready`, bounded metrics와 OIDC 포함 12단계 smoke 통과
- smoke 결과 FILLED/REJECTED/UNKNOWN→FILLED, outbox event/delivery 3/3 유지
- 원격 DB 사전점검·endpoint/credential·catalog·migration/seed·deploy 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0008` RESOLVED: readonly API snapshot과 mutable counter 저장소 type을 분리하고 전체 gate로 재검증했다.
- 실제 monitoring collector와 distributed circuit state는 현재 local 범위 밖이다. process-local metrics/circuit은 business source of truth가 아니다.

### 다음 작업

- `DEV-0012`: onboarding/risk profile 편집과 규칙 기반 portfolio recommendation 범위 재확정 및 선택 범위 구현

## DEV-0012 — Risk Profile Backend Lane

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- base commit: `65ab33333455d35a82a57a5f0df8793ac06cd9c4`
- contract revision: additive GET/PUT risk profile / DB migration 없음
- migration owner: single main, schema 변경 없음, local/Testcontainers only
- 예정 commit: `feat(dev): add versioned risk profile settings [DEV-0012]`

### 완료와 검증

- identity provisioning과 risk profile repository port를 분리하고 기존 `finapp_risk_profile`에 owner/version conditional update를 구현했다.
- GET `financial.read`, PUT `financial.write`, canonical 400/409와 redacted audit를 provider E2E로 검증했다.
- PostgreSQL에서 default profile, version 0→1과 stale update no-op를 확인하고 actual OIDC GET→PUT도 통과했다.
- root verify는 mobile 97/simulator 12/platform 80 총 189 tests와 두 backend build를 통과했다.
- 추천 engine/API는 만들지 않았고 DB migration·원격 작업은 없었다.

### 이슈·누락·Handoff

- `BE-ISSUE-0009` RESOLVED.

### 다음 작업

- `DEV-0013`: local 핵심 query plan과 dependency advisory 재확인

## 새 기록 Template

```markdown
## BE-#### — 제목

- 날짜: YYYY-MM-DD
- Milestone: N
- 상태: COMPLETED | BLOCKED | PARTIAL
- base commit:
- contract revision:
- migration owner:
- commit: `<type>(be): <summary> [BE-####]`

### 완료
- ...

### 변경 파일
- ...

### 검증
- 명령:
- 결과:

### 원격 DB
- 사용 여부:
- migration commit/dataset version:
- 결과:

### 이슈·누락·Handoff
- BE-ISSUE/BE-GAP/Handoff:

### 다음 작업
- BE-####:
```
