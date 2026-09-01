# 단일 Main 통합 개발 실행계획

- 상태: ACTIVE
- 작성일: 2026-09-02
- 적용 시작: `DEV-0007`
- 검토 기준 commit: `2574ad0be71c1c71e44c862ab37f395ac498f449`
- 활성 branch/worktree: `main` / `/Users/switch/Development/Web/FinancialApp`
- 현재 실행 종료선: 단계 10 로컬 하드닝 완료 후 STOP
- 현재 실행 제외: 원격 DB 접속·사전점검·migration/seed와 원격 배포
- 완료 단계: 단계 1 `DEV-0010`, 단계 2 `BE-0009`, 단계 3 `BE-0010`, 단계 4 `FE-0010`, 단계 5 `FE-0011`
- 다음 작업 ID: `FE-0012`

## 1. 목적과 문서 권한

이 문서는 `DEV-0006`에서 frontend와 backend 병렬 작업을 `main`에 통합한 뒤, 한 작업 흐름에서 로컬 MVP와 Milestone 6의 로컬 하드닝까지 이어서 개발하기 위한 활성 실행계획이다. 이번 실행은 원격 DB 단계 직전에 반드시 종료한다.

기존 `CODEX_IMPLEMENTATION_PLAN.md`는 최초 milestone과 작업 원칙의 기준선으로, `PARALLEL_DEVELOPMENT_GUIDE.md`와 `docs/workstreams/**`의 기존 항목은 분리 개발 이력으로 보존한다. 이후 작업 순서, commit 분할과 통합 완료 판정은 본 문서를 따른다. 제품 범위, 보안, 아키텍처와 계약 자체는 본 문서가 임의로 변경하지 않는다.

문서가 충돌하면 다음 순서로 판단한다.

1. `MVP_SCOPE.md`
2. `IMPLEMENTATION_DECISIONS.md`와 `docs/adr/**`
3. `ARCHITECTURE_GUIDE.md`, `API_CONTRACTS.md`, `DATA_MODEL.md`, `TABLE_DEFINITIONS.md`, `SECURITY_MODEL.md`, `TEST_STRATEGY.md`
4. 본 문서
5. `CODEX_IMPLEMENTATION_PLAN.md`
6. `Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`

## 2. 분리 작업 검토 결과

검토 대상은 공통 base `5ffc23e`, backend `BE-0001`~`BE-0008` head `0753110`, frontend `FE-0001`~`FE-0009` head `dfc3547`, 통합 commit `2574ad0`이다.

- 두 분리 branch의 약속된 commit은 모두 `main`과 원격 보존 branch에 존재한다. Git 이력 유실은 없다.
- 병렬 개발용 `FinancialApp-frontend`, `FinancialApp-backend` worktree는 통합 후 변경사항이 없는 것을 재확인하고 `DEV-0008`에서 제거했다. local/remote `codex/frontend`, `codex/backend` branch는 복구 이력으로 유지한다.
- root lockfile, 환경변수, Keycloak redirect, architecture gate와 Docker build context 충돌은 `DEV-0006`에서 해소됐다.
- backend는 Milestone 2~5의 API와 영속화 대부분을 frontend보다 먼저 구현했다.
- frontend는 OIDC/App Lock/Query/transport 기반까지 완료했지만 분리 당시 고정한 health 계약 때문에 현재 backend의 업무 API를 아직 소비하지 않는다.
- 현재 root 계약 검증은 OpenAPI lint와 health fixture 1건만 확인한다. 최초 병렬 지침이 요구한 controller–OpenAPI–frontend mock 전체 일치와 실제 provider/consumer 검증은 아직 충족하지 못한다.
- 따라서 분리 작업은 안전하게 통합됐지만 로컬 MVP 기능 완료가 아니라 통합 개발 기준선 완료로 판정한다.

## 3. 요구사항 대비 현재 상태

| 영역 | 구현된 기준선 | 남은 작업 | 판정 |
|---|---|---|---|
| Milestone 0~1 | workspace, Expo, 두 NestJS/Fastify 서비스, PostgreSQL/Keycloak Compose, CI/architecture gate | fresh-clone 명령 계약 보강 | 기능 기준선 DONE |
| Milestone 2 | backend JWT와 `/me`, mobile PKCE/session/App Lock/401 lifecycle | 실제 local Keycloak 로그인, `/me`, restart refresh, 실기기 항목 | IN_PROGRESS |
| Milestone 3 | simulator 원천 데이터, manual/scheduled sync, raw/derived, 자산 조회, 최소 audit, mobile Dashboard/Accounts/sync UX | local actual API smoke 완료 | DONE |
| Milestone 4 | deterministic simulation engine와 저장/조회 | mobile 입력, 결과 차트와 disclaimer | IN_PROGRESS |
| Milestone 5 | quote, reservation, simulator brokerage/scenario, settlement/reconciliation/ledger/position/execution/audit와 주문 조회 | mobile 주문 흐름과 full-stack E2E | IN_PROGRESS |
| Simulator MVP | 계좌/보유/거래/시세/주문/status, 6개 장애 scenario, deterministic reset/reseed와 platform developer proxy | mobile 포함 전체 E2E에서 재검증 | DONE (local service boundary) |
| Contract 품질 | OpenAPI 2개, 현재 operation 31개 controller/provider/fixture/consumer 추적과 호환성 gate | 이후 operation 추가 시 같은 coverage와 provider schema 검증 유지 | DONE (current surface) |
| Local E2E | 서비스별 test와 수동 Compose smoke | mobile→IdP→platform→simulator→DB 전체 인수 시나리오 | NOT_STARTED |
| Milestone 6A local | 일부 scheduled sync를 선행 구현 | outbox, local KMS adapter 경계, security event, 관측성 보강과 포트폴리오 문서 | NOT_STARTED |
| Milestone 6B remote | 없음 | Lightsail DB migration, AWS KMS, HTTPS/EAS와 원격 rollback | CURRENT_RUN_EXCLUDED |

### 3.1 최초 계획에서 누락되거나 약하게 연결된 항목

다음 항목은 새 기능 제안이 아니라 기존 승인 문서의 요구사항을 실제 구현 상태와 대조해 발견한 보강 대상이다.

1. `GAP-0004`: `DEV-0010`에서 controller, canonical OpenAPI, provider test와 consumer fixture/adapter 상태의 전체 추적 및 호환성 gate를 구현해 해결했다.
2. `GAP-0005`: `BE-0009`에서 simulator 시세·brokerage·장애 scenario·reset/reseed와 실제 HTTP 검증을 구현해 해결했다.
3. `GAP-0006`: `BE-0010`에서 로컬 MVP append-only audit table/action/권한과 redaction 경계를 구현해 해결했다.
4. `GAP-0007`: 실제 서비스 전체를 연결한 자동 E2E와 fresh-clone 인수 명령이 없다.
5. frontend M3~M5 화면은 누락이라기보다 계획된 미구현 상태이며 `FE-0011` 이후 단계에서 화면과 API를 한 vertical slice로 연결한다.
6. onboarding/risk profile 편집과 규칙 기반 `portfolio` 추천은 상세 명세에는 있으나 승인된 로컬 MVP 항목에는 없다. 로컬 MVP 후 Milestone 6 진입 시 구현 여부와 완료 조건을 다시 확정한다.
7. outbox, local KMS adapter 경계와 production 수준 관측성은 로컬 MVP 후 단계 10에서 처리한다.
8. Lightsail DB migration, 실제 AWS KMS와 원격 배포는 장기 Milestone 6 범위로 보존하되 이번 실행에서는 제외한다. 미완료 Gap이나 blocker로 취급하지 않고 STOP gate에서 종료한다.

## 4. 단일 Main 작업 규칙

### 4.1 Branch와 작업 소유권

- 모든 신규 작업은 현재 workspace의 `main`에서 직렬 진행한다.
- `codex/frontend`와 `codex/backend` branch는 `DEV-0006` 복구 이력으로만 보존하며 새 commit을 만들지 않는다. 보조 worktree directory는 `DEV-0008`에서 제거했다.
- mobile 중심 commit은 `FE-####`, backend/infra/contract 중심 commit은 `BE-####`, 공통 품질·통합·문서 commit은 `DEV-####`를 계속 사용한다.
- 같은 commit에서 frontend와 backend 구현을 무리하게 섞지 않는다. 단, 하나의 실제 E2E 인수 단계와 필수 공통 문서 갱신은 `DEV-####`로 묶을 수 있다.
- migration은 한 commit에서 한 명의 migration owner만 생성하며, 모든 애플리케이션 소유 DB 객체에 `finapp_` prefix를 적용한다.

### 4.2 멈춤 없는 진행

승인된 범위 안에서 안전하게 진행 가능한 작업이 남아 있으면 중간 계획만 남기고 멈추지 않는다.

- 한 단계가 끝나면 본 문서의 다음 미완료 단계로 이동한다.
- 외부 credential 또는 실제 기기가 없어도 local/test/contract/document 작업을 계속한다.
- test/build 실패는 누락 사유로 처리하지 않고 원인을 수정하거나 재현 가능한 issue로 기록한다.
- 이번 실행에서는 원격 DB endpoint/credential을 요청하거나 확인하지 않고, 원격 접속·catalog 사전점검·migration·seed/reset·유료 resource 생성과 외부 배포를 모두 실행하지 않는다.
- 단계 10의 로컬 하드닝 완료 후 반드시 최종 상태를 보고하고 멈춘다. 원격 단계로 자동 이동하지 않는다.
- 향후 사용자가 원격 단계를 명시적으로 다시 시작하라고 요청한 경우에만 별도 계획과 승인 경계를 작성한다. 과거의 원격 migration 승인은 이번 실행에 재사용하지 않는다.
- 사용자 변경과 충돌하거나 범위·보안 경계를 바꾸는 결정만 사용자 확인을 위해 멈춘다.

### 4.3 계약 우선 순서

API가 바뀌는 모든 backend 단계는 다음 순서를 한 commit에서 지킨다.

1. `API_CONTRACTS.md`와 canonical OpenAPI의 기존 요구를 확인한다.
2. additive 변경을 우선하고 호환성 영향을 기록한다.
3. provider 구현과 실제 Fastify E2E 검증을 추가한다.
4. response/problem fixture 또는 schema 검증 대상을 추가한다.
5. frontend가 소비할 operation, schema와 contract revision을 lane log에 기록한다.
6. frontend 단계에서 같은 계약의 application model mapper, mock과 real adapter를 함께 구현한다.

OpenAPI lint만 통과한 상태를 구현 일치로 간주하지 않는다. 수동 작성 OpenAPI를 유지하는 동안에는 operation별 provider test와 consumer fixture가 추적 가능해야 한다.

### 4.4 아키텍처와 품질

- backend는 NestJS module 기반 modular monolith와 feature 내부 ports/adapters를 유지한다.
- mobile은 `app → features → shared` 의존 방향, TanStack Query server state, Zustand client-only state를 유지한다.
- controller가 repository/Drizzle을 직접 호출하거나 화면이 wire DTO와 transport 세부 구현에 직접 결합하지 않는다.
- 구현과 unit/component/integration test를 같은 commit에 포함한다.
- 구조 경계를 바꾸는 refactor는 관련 test가 있는 작은 commit으로 수행하고 필요하면 ADR을 추가한다.
- 테스트 비활성화, architecture ignore, `npm audit fix --force`, 주문 POST 자동 retry와 외부 HTTP를 포함한 장시간 DB transaction을 금지한다.

## 5. 실행 단계

각 단계의 ID는 예약된 기본값이다. 범위가 커져 atomic commit 분할이 필요하면 다음 ID로 분리하고 본 문서·상태·로그를 먼저 갱신한다.

### 단계 0 — 통합 계획 기준선 (`DEV-0007`)

목표:

- 분리 작업과 승인 요구사항의 차이를 문서로 확정한다.
- 본 문서를 활성 실행계획으로 지정하고 중앙 Gap과 다음 작업을 연결한다.
- workstream 문서를 read-only branch 이력과 main의 영역별 로그로 구분한다.

완료 조건:

- 문서 인덱스, 우선순위, 상태, 결정, issue/gap와 개발 로그가 같은 다음 작업을 가리킨다.
- 문서 format과 link/path 참조가 유효하다.

### 단계 1 — 계약 추적과 통합 Test Harness (`DEV-0010`, DONE)

목표:

- `GAP-0004`를 먼저 해소해 이후 backend/frontend가 같은 계약을 사용하게 한다.
- canonical OpenAPI의 모든 operation을 provider test, consumer fixture/adapter 상태와 매핑한다.
- 실제 Fastify 응답과 주요 ProblemDetails가 계약 schema를 통과하는 검증 기반을 만든다.
- 호환되지 않는 schema/path/status 제거를 CI에서 감지한다.

완료 조건:

- health 1건이 아니라 현재 platform/simulator operation 전체의 검증 상태가 machine-readable 또는 테스트로 추적된다.
- 새 endpoint가 구현·provider test·계약 검증 없이 완료될 수 없다.
- root `contract:check`와 CI가 동일한 검증을 실행한다.

완료 증거:

- `contracts/operation-coverage.yaml`이 platform 16개와 simulator 4개 operation의 controller/handler, provider test, consumer fixture/adapter 상태를 추적한다.
- `contracts/fixtures/operation-responses.json`의 operation별 성공 fixture와 주요 ProblemDetails를 실제 OpenAPI response schema로 검증한다.
- 실제 NestJS/Fastify provider E2E가 현재 20개 operation 성공 응답과 platform의 주요 400/401/403 응답을 canonical schema에 대조한다.
- `contract:check`가 controller route drift, 누락 operation/provider/fixture, response schema 누락과 compatibility baseline의 path/status/schema 제거를 실패 처리한다.

### 단계 2 — Simulator 거래·Scenario 경계 (`BE-0009`, DONE)

목표:

- simulator 시세, brokerage submit/status, `clientOrderId` 멱등성과 scenario 상태를 구현한다.
- 최소 `NORMAL`, `TIMEOUT`, `HTTP_500`, `MALFORMED_RESPONSE`, `ORDER_REJECT`, `ORDER_UNKNOWN_THEN_FILLED`를 실제 HTTP로 재현한다.
- local/test 전용 reset/reseed를 구현하고 production/public route 경계를 검증한다.
- simulator OpenAPI, Drizzle migration, deterministic seed와 provider test를 같은 commit에 반영한다.
- platform quote preview가 simulator 시세를 내부 HTTP로 소비하는 adapter를 연결하되 외부 호출은 DB transaction 밖에서 수행한다.

완료 조건:

- 같은 `clientOrderId`/payload는 한 주문만 만들고 다른 payload는 conflict다.
- scenario가 테스트 간 격리되고 UNKNOWN 이후 status 조회로 결정적 FILLED를 반환한다.
- clean migration, seed 2회 멱등성, prefix와 role isolation이 통과한다.
- `GAP-0005`의 simulator 측 조건이 해결된다.

완료 증거:

- canonical simulator OpenAPI에 시세 3개, brokerage 2개, admin 2개 operation을 추가하고 전체 27개 operation·30개 fixture 계약 gate를 통과했다.
- PostgreSQL advisory lock으로 같은 `clientOrderId` 10개 동시 제출 중 주문 하나만 생성하며 payload conflict와 UNKNOWN→FILLED 전이를 Testcontainers에서 검증했다.
- clean Compose에서 migration, seed 2회, actual HTTP의 400/201/200 replay, reconciliation과 reset→NORMAL을 검증했다.
- simulator production image build와 runtime dependency audit 0을 확인했고 platform 시세 adapter는 timeout/no-retry 및 transaction 밖 호출 경계를 유지한다.

### 단계 3 — Platform Settlement·Reconciliation·Audit (`BE-0010`, DONE)

목표:

- DB transaction 밖에서 simulator 주문을 submit하고 FILLED/REJECTED/UNKNOWN으로 전이한다.
- execution, cash ledger, position, reservation과 order를 한 settlement transaction에서 정합성 있게 갱신한다.
- UNKNOWN reconciliation job의 claim/lease/backoff와 중복 settlement 방지를 구현한다.
- 주문 단건/목록 조회와 append-only 최소 audit event를 계약에 추가한다.
- local/demo developer scenario/reset API를 simulator admin API에 연결하고 production module 미등록과 `scenario.admin` 경계를 검증한다.

완료 조건:

- 정상 체결, 거절, timeout→UNKNOWN→FILLED가 실제 simulator HTTP로 검증된다.
- worker 두 개가 같은 reconciliation을 처리해도 external status query/settlement 결과가 한 번만 반영된다.
- reservation release/settlement 후 available/reserved 합계, execution, ledger와 position 불변조건이 통과한다.
- `ORDER_CREATED`, `ORDER_SUBMITTED`, `ORDER_RECONCILED`, `ORDER_FILLED` audit가 append-only로 저장된다.
- `MYDATA_CONNECTION_CREATED`, `MYDATA_SYNC_STARTED/COMPLETED`, `SIMULATION_EXECUTED`도 같은 audit 경계로 기록된다.
- `GAP-0006`과 Milestone 5 backend 완료 조건을 해결한다.

완료 증거:

- cash reservation 뒤 실제 simulator POST를 1회만 호출하고 FILLED/REJECTED settlement와 UNKNOWN claim/lease/backoff reconciliation을 구현했다.
- PostgreSQL 17.6에서 worker 동시 claim 하나, duplicate settlement 하나, execution/position/ledger/cash 불변조건과 최대 실패 환불을 검증했다.
- append-only `finapp_audit.finapp_audit_event`에 MyData/simulation/order/developer action을 allowlist metadata로 기록하고 runtime UPDATE/DELETE를 차단했다.
- order 단건/목록과 local/demo developer proxy를 추가해 canonical surface 31 operation·34 fixture gate를 통과했고 production에서는 developer module이 등록되지 않는다.
- clean Compose에서 실제 JWT platform process와 simulator를 연결해 sync, FILLED, REJECTED, UNKNOWN→FILLED, reset을 통과했다.

### 단계 4 — Live OIDC와 `/me` Mobile 통합 (`FE-0010`) ✅ 완료

목표:

- 현재 `main`의 `/api/v1/me` 계약을 mobile application model과 authenticated adapter에 연결한다.
- local Keycloak 합성 test user, public client와 앱 공개 환경변수를 재현 가능한 local setup에 연결한다.
- login→callback→App Lock→`/me`, restart refresh, logout/cache clear를 검증한다.

완료 조건:

- config missing/mock/real adapter가 같은 application port를 구현한다.
- 실제 access token으로 `/me` 성공과 scope/expired token 실패를 확인한다.
- Android Development Build에서 가능한 live 흐름을 통과한다.
- iOS/실기기 제약은 `GAP-0002`/`GAP-0003`과 분리하고, 환경이 제공되면 즉시 재검증한다.
- `GAP-0001`을 해결하거나 남은 수동 조건을 더 좁은 Gap으로 갱신한다.

완료 증거:

- config missing/mock/real 구현이 같은 `PlatformApi` port를 사용하고 canonical `/api/v1/me` fixture와 strict response mapper를 통과했다.
- clean Compose Keycloak realm에서 합성 사용자를 멱등 provisioning하고 PKCE S256, state, JWT 서명/issuer/audience/subject/scope, `/me`, refresh-only restart, logout/revocation smoke를 통과했다.
- Android API 36 Development Build에서 시스템 브라우저 login→callback route→App Lock OS fingerprint prompt→실제 `/me`를 통과했다.
- Android app process force-stop/restart 뒤 SecureStore refresh→App Lock→`/me`를 다시 통과했고 local logout은 session/Query cache를 지우고 로그인 화면으로 복귀했다.
- 실제 물리 기기의 cancel/lockout/background timing과 iOS runtime은 기존 `GAP-0002`/`GAP-0003`에만 남기고 `GAP-0001`을 해결했다.

### 단계 5 — MyData와 Dashboard Vertical Slice (`FE-0011`) ✅ 완료

목표:

- connection 생성/조회, manual sync와 완료 polling을 구현한다.
- Dashboard, Accounts, account detail, holdings, transactions와 history를 실제 API에 연결한다.
- total/history/allocation chart와 loading, empty, stale, partial/error/retry UX를 구현한다.

완료 조건:

- mobile이 계산한 임의 합계가 아니라 PostgreSQL 기반 backend summary를 표시한다.
- sync 완료 후 관련 Query를 정확히 invalidate한다.
- money/quantity mapper, masked identifier와 cursor 계약을 component/adapter test로 검증한다.
- synthetic disclaimer, 접근성 label/touch target과 Reduce Motion 기본 동작이 있다.

완료 증거:

- connection 생성/목록, manual sync/status polling과 6개 자산 조회를 authenticated `PlatformApi` adapter/Query에 연결했다.
- PostgreSQL 기반 summary를 화면의 총자산 기준으로 사용하고 sync 완료 시 connection/summary/account/holding/transaction/history Query를 invalidate한다.
- canonical money·quantity, masked identifier, MVP `nextCursor: null`과 exact response를 fail-closed guard 및 adapter/component test로 검증했다.
- loading, empty, stale, partial error/retry, mutation error와 48px 이상 touch target, synthetic disclaimer, Reduce Motion chart 접근성을 구현했다.
- 로컬 PostgreSQL/Compose simulator와 실제 Platform API에서 sync 뒤 account/holding/transaction/summary/history를 읽고 기존 주문 정상·거절·UNKNOWN reconciliation까지 smoke를 통과했다.

### 단계 6 — Simulation Vertical Slice (`FE-0012`)

목표:

- Zustand에는 제출 전 draft만 두고 실행/결과는 TanStack Query로 관리한다.
- 입력 검증, server mutation, 저장 결과 조회와 p10/p50/p90 chart를 구현한다.

완료 조건:

- 화면은 server result만 표시하고 `engineVersion`, `assumptionSetVersion`과 disclaimer를 노출한다.
- loading/error/retry와 validation error code UX가 있다.
- percentile chart, tooltip/interaction과 Reduce Motion test가 통과한다.

### 단계 7 — Order와 복구 Vertical Slice (`FE-0013`)

목표:

- quote preview, 만료, 주문 전 local biometric gate와 idempotency key 수명주기를 구현한다.
- submit 결과와 order history/status를 표시하고 UNKNOWN은 POST 재시도 없이 status polling으로 복구한다.
- FILLED 후 cash, holding, portfolio/summary와 order Query를 invalidate한다.

완료 조건:

- 동일 사용자 action의 불명확 응답에서 새 key/새 POST를 자동 생성하지 않는다.
- `QUOTE_EXPIRED`, `INSUFFICIENT_FUNDS`, `IDEMPOTENCY_CONFLICT`, `UNKNOWN`, `REJECTED` UX가 있다.
- 주문 POST no-retry와 biometric 성공 전 submit 금지를 component/network test로 검증한다.

### 단계 8 — Settings·Developer Scenario·접근성 (`FE-0014`)

목표:

- logout, dataset/synthetic 정보, 금액 가리기와 Settings 화면을 완성한다.
- local/demo에서만 simulator scenario와 reset을 조작하는 developer panel을 제공한다.
- production profile에서는 developer UI와 endpoint를 사용할 수 없음을 검증한다.

완료 조건:

- 장애 scenario를 앱에서 선택해 timeout/500/malformed/reject/unknown 흐름을 재현할 수 있다.
- production build/config에는 dev route 진입점이 없다.
- 핵심 화면의 접근성, Reduce Motion과 민감정보 가리기 검토가 완료된다.

### 단계 9 — 로컬 MVP 전체 인수 (`DEV-0011`)

목표:

- `MVP_SCOPE.md`의 12단계 시나리오를 clean 환경에서 처음부터 끝까지 검증한다.
- `make`/npm 명령을 실제 구현과 맞추고 fresh clone 문서를 검증한다.
- 자동 E2E, 실제 simulator contract suite, migration/concurrency/security/smoke를 하나의 release gate로 묶는다.

완료 조건:

- login→sync→Dashboard→simulation→BUY→settlement와 UNKNOWN reconciliation이 실제 서비스/DB에서 성공한다.
- clean `npm ci`, migration, deterministic seed, `npm run verify`, Docker image와 Compose smoke가 통과한다.
- Test Strategy가 약속한 실행 가능한 root 명령과 결과가 문서화된다.
- unresolved 항목은 외부 수동 검증과 Milestone 6 항목뿐이며 `GAP-0007`이 해결된다.
- `IMPLEMENTATION_STATUS.md`의 Milestone 2~5를 증거와 함께 DONE으로 전환한다.

### 단계 10 — Milestone 6 로컬 하드닝

로컬 MVP 완료 후 진행한다.

- settlement transaction과 DB outbox, idempotent publisher
- local `DataKeyProvider`와 AWS KMS adapter 경계, wrong AAD test
- security event, 구조화 로그/redaction, readiness/metrics와 circuit breaker
- production profile의 developer module 미등록 검증
- onboarding/risk profile 편집과 규칙 기반 portfolio recommendation의 최종 범위 재확정 및 선택된 항목 구현
- 핵심 조회 3개 이상의 query plan과 성능 근거 기록
- dependency advisory 재확인과 release 위험 판정
- 아키텍처/sequence/보안/제한사항/요구사항 대응표와 3분 데모 문서

### 단계 11 — 원격 Demo와 Preview (`CURRENT_RUN_EXCLUDED`)

이 단계는 이번 실행에서 진행하지 않는다. 단계 10 완료 후 Codex는 다음을 수행한다.

1. local 완료 결과와 남은 외부 항목을 문서에 기록한다.
2. 마지막 검증된 local commit을 `origin/main`에 push한다.
3. 원격 DB에 연결하거나 사전 설정 검토를 시작하지 않고 사용자에게 종료 상태를 보고한다.
4. 후속 사용자 요청을 기다리며 멈춘다.

향후 사용자가 별도 실행으로 원격 단계를 명시적으로 재개할 때만 아래 범위를 새 계획으로 활성화한다.

- Lightsail PostgreSQL engine/TLS/backup/role/schema/prefix 사전 점검
- 승인된 forward-only migration과 synthetic seed
- AWS KMS, API/Keycloak/private simulator, Nginx/HTTPS 배포
- EAS Preview Build, 원격 smoke/E2E와 rollback rehearsal
- commit SHA, migration history, dataset version과 수동 기기 결과 기록

## 6. 단계별 검증 Gate

### 모든 commit

- `git status --short --branch`
- 변경 영역 formatter, lint, strict typecheck와 관련 test
- 관련 architecture gate
- API 변경 시 contract lint와 operation/fixture/provider 검증
- `git diff --check`
- secret/실제 개인정보 패턴 검사
- 관련 개발 로그, 상태와 issue/gap 갱신

### DB 또는 backend vertical slice

- 빈 PostgreSQL Testcontainers migration
- schema/table/index/constraint/history의 `finapp_` prefix 검사
- role isolation과 immutable 권한 검사
- transaction, concurrency, retry/recovery invariant test
- 실제 Fastify HTTP E2E와 필요한 실제 simulator integration

### Milestone 또는 통합 checkpoint

- clean `npm ci`
- root `npm run verify`
- production Docker image build와 runtime dependency audit
- clean Compose migration/seed/health/smoke
- vulnerability 수치와 미해결 위험 기록

## 7. Commit과 문서 갱신 규칙

- 하나의 검증 가능한 vertical slice를 하나의 commit으로 만든다.
- commit 제목은 `<type>(fe|be|integration|mN): <summary> [FE|BE|DEV-####]` 형식을 사용한다.
- `FE-####`/`BE-####` commit은 해당 workstream `DEVELOPMENT_LOG.md`에 같은 ID를 추가하고 중앙 `IMPLEMENTATION_STATUS.md`와 관련 중앙 Gap을 같은 commit에서 갱신한다.
- `DEV-####` commit은 중앙 `DEVELOPMENT_LOG.md`에 같은 ID를 추가한다.
- 완료하지 못한 checklist를 삭제하거나 축소하지 않는다. `ISSUE_REGISTER.md`에 이유, 영향, 목표 단계, 재개/해결 조건을 기록한다.
- issue/gap은 해결 후에도 삭제하지 않고 해결 ID와 검증 증거를 남긴다.
- 검증 통과 후 commit하고 `origin/main`에 push한다. 실패하거나 미검증인 변경은 완료로 표시하지 않는다.
- push 후 local `main`, `origin/main`, working tree 상태를 확인한 다음 단계로 이동한다.

## 8. 작업 시작·종료 Checklist

### 시작

- [ ] `main`과 `origin/main`의 기준 SHA 및 사용자 변경 확인
- [ ] 본 문서의 첫 미완료 단계와 다음 FE/BE/DEV ID 확인
- [ ] 중앙 및 해당 lane issue/gap 확인
- [ ] 관련 계약, 아키텍처, 보안, 테이블/테스트 문서 확인
- [ ] 단계의 완료 조건과 외부 권한 경계 확인

### 종료

- [ ] 구현, test, 계약/migration과 문서가 같은 단계로 추적됨
- [ ] 필수 검증 명령과 실제 결과 기록
- [ ] 신규 issue/gap과 기존 항목 상태 갱신
- [ ] 다음 작업 ID와 진입 조건 기록
- [ ] atomic commit, push와 clean status 확인

## 9. 최종 완료 판정

- 로컬 MVP 완료는 단계 9와 `MVP_SCOPE.md`의 완료 정의를 모두 충족할 때만 선언한다.
- 이번 실행 완료는 단계 10의 로컬 하드닝, 문서 갱신, commit/push까지다. 완료 직후 단계 11 전에 반드시 멈춘다.
- 원격 migration을 실행하지 않은 것은 이번 실행의 누락이나 blocker가 아니라 사용자가 확정한 범위 제외다.
- 전체 Milestone 6 완료는 향후 별도 실행에서 승인된 원격 환경의 migration, KMS, HTTPS, Preview Build, 원격 E2E와 rollback 증거까지 있어야 선언할 수 있다.
- iOS/Android 실기기, AWS/Lightsail 같은 외부 검증은 자동 결과와 구분해 기록한다.
- `IMPLEMENTATION_STATUS.md`, 실제 Git/DB 상태와 테스트 결과가 다르면 문서의 완료 표시를 되돌리고 issue/gap을 등록한다.
