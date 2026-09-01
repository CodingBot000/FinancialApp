# Backend Workstream 개발 로그

- 기록 방식: append-only
- 다음 ID: `BE-0005`
- branch/worktree: `codex/backend` / `/Users/switch/Development/Web/FinancialApp-backend`
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at BE-0004, `institution-simulator-v1` at BE-0003
- migration owner: backend session 또는 integration owner가 작업마다 기록

backend session은 `services/**`, `infra/**`, OpenAPI와 migration 변경을 commit 단위로 기록한다. 중앙 `DEVELOPMENT_LOG.md`는 integration owner 역할로 통합할 때만 수정한다.

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
