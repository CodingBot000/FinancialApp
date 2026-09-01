# 구현 상태

- 현재 Milestone: 6A — 로컬 하드닝
- 전체 상태: IN_PROGRESS
- 마지막 갱신: 2026-09-02
- 마지막 완료 ID: DEV-0011
- 다음 작업 ID: BE-0012
- 활성 계획: `INTEGRATED_DEVELOPMENT_PLAN.md`
- 현재 실행 STOP gate: 단계 10 local hardening 완료 후, 원격 단계 진입 전 종료

## 상태 표기

- `NOT_STARTED`: 시작하지 않음
- `IN_PROGRESS`: 구현 또는 검증 중
- `BLOCKED`: 외부 조건 없이는 진행 불가
- `CURRENT_RUN_EXCLUDED`: 장기 범위에는 있으나 이번 실행에서는 진행하지 않음
- `DONE`: 완료 조건과 검증 통과

## 단일 Main 통합 상태

- 공통 base: `5ffc23edf403c56b95d15656724a23f7a62546af`
- backend 통합 범위: `BE-0001`~`BE-0008`, head `0753110889608042a0661fcd1283e0b513941ddf`
- frontend 통합 범위: `FE-0001`~`FE-0009`, head `dfc3547fecc7e6f6d770bd5908d6ea5095e74f58`
- backend merge commit: `b927e3a`
- frontend merge commit: `2926278`
- 운영 방식: 병렬 worktree 단계 종료, 이후 작업은 `main` 한 곳에서 직렬 진행
- 원격 보존 branch: `origin/codex/backend`, `origin/codex/frontend`
- 보조 worktree: DEV-0008에서 제거, 활성 directory는 `/Users/switch/Development/Web/FinancialApp` 하나
- 통합 계획 검토 기준: `2574ad0`; 분리 commit 유실 없음

## Milestone 요약

| Milestone | 상태 | 현재 결과와 남은 완료 조건 |
|---|---|---|
| 0. 저장소와 결정 기준선 | DONE | 문서, Node.js 24, workspace, 공통 품질 gate 완료 |
| 1. 실행 가능한 골격 | DONE | Expo, 두 NestJS/Fastify 서비스, Compose, PostgreSQL/Keycloak, health, CI 완료 |
| 2. OIDC와 App Lock | DONE | Android Development Build에서 live PKCE→App Lock→`/me`, process restart refresh와 logout/cache clear 완료; iOS·물리 기기 edge case는 GAP-0002/0003으로 분리 |
| 3. 동기화와 Dashboard | DONE | backend sync/raw/derived/조회·audit와 frontend connection/sync polling, Dashboard/Accounts/detail/chart, 부분 오류 UX 및 local actual API smoke 완료 |
| 4. 서버 시뮬레이션 | DONE | deterministic server 저장/조회, frontend draft validation·persisted result·p10/p50/p90 chart와 local actual API smoke 완료 |
| 5. BUY 주문과 복구 | DONE | quote/biometric/idempotent mobile BUY, backend reservation/simulator/settlement/reconciliation/audit, UNKNOWN GET recovery와 actual local smoke 완료; clean 전체 인수는 DEV-0011 |
| 6A. 로컬 하드닝 | IN_PROGRESS | DEV-0011 local MVP 인수 완료; outbox, local KMS adapter 경계, security event/관측성, 최종 포트폴리오 문서 진행 |
| 6B. 원격 데모 | CURRENT_RUN_EXCLUDED | Lightsail migration, 실제 AWS KMS, HTTPS/EAS와 원격 rollback은 향후 별도 실행 |

## DEV-0010 계약 Gate

- [x] canonical platform 16개/simulator 4개 operation 전체를 machine-readable coverage로 추적
- [x] controller method/path와 OpenAPI operation 양방향 일치 검사
- [x] operation별 provider test, 성공 consumer fixture와 adapter 상태 추적
- [x] 실제 Fastify 20개 성공 응답과 주요 platform ProblemDetails schema 검증
- [x] 모든 documented response의 JSON schema 존재 검사
- [x] 기존 operation path/status와 component schema/property 제거 compatibility gate
- [x] root `contract:check`와 CI contracts job 동일 validator 실행
- [x] local Colima socket을 명시한 root `npm run verify`: 114 tests와 두 backend build 통과

## BE-0009 Simulator 거래·Scenario 경계

- [x] simulator 시세·history, brokerage submit/status와 6개 deterministic scenario 구현
- [x] 같은 `clientOrderId`/payload는 단일 주문과 200 replay, 다른 payload는 409 conflict
- [x] `ORDER_UNKNOWN_THEN_FILLED`의 UNKNOWN 생성 후 첫 status 조회에서 결정적 FILLED 전이
- [x] local/test reset/reseed와 production admin 404/no-mutation 경계
- [x] simulator migration `0002_finapp_simulator_trading`, seed 2회 멱등성과 prefix/role isolation
- [x] platform quote가 DB transaction 밖에서 simulator 시세를 읽는 timeout/no-retry HTTP adapter
- [x] canonical 계약 27개 operation·30개 fixture와 실제 Fastify provider schema 검증
- [x] Testcontainers PostgreSQL 동시성, 실제 network timeout, clean Compose migration/seed/HTTP smoke 통과
- [x] root verify 중 발견된 Expo SDK 57 patch drift를 `ISSUE-0004`로 기록·해결하고 dependency gate 복구
- [x] local Colima socket을 명시한 최종 root `npm run verify`: 총 123 tests와 두 backend build 통과

## BE-0010 Platform Settlement·Reconciliation·Audit

- [x] cash reservation commit 뒤 simulator 주문 POST를 1회 호출하고 timeout/500/malformed는 UNKNOWN으로 전환
- [x] FILLED/REJECTED의 cash, reservation, execution, position, ledger와 order를 단일 settlement transaction으로 반영
- [x] UNKNOWN claim/lease/backoff/max-attempt worker와 중복 settlement 방지, 최대 실패 예약금 반환
- [x] owner-scoped 주문 단건/목록 조회와 200 replay/201 final/202 UNKNOWN 계약
- [x] append-only audit에 MyData, simulation, order와 developer scenario action 및 allowlist metadata 저장
- [x] local/demo developer scenario/reset proxy와 production module 미등록 검증
- [x] canonical 계약 31개 operation·34개 fixture/provider/consumer/compatibility gate 통과
- [x] Testcontainers PostgreSQL settlement/concurrency/권한과 platform 61 tests 통과
- [x] clean Compose actual flow: sync→NORMAL FILLED→REJECTED→UNKNOWN reconciliation FILLED→reset
- [x] platform/simulator production image build와 runtime audit 0, catalog prefix 위반 0
- [x] local Colima socket을 명시한 최종 root `npm run verify`: 총 133 tests와 두 backend build 통과

## FE-0010 Live OIDC와 `/me`

- [x] config missing/mock/HTTP가 동일 `PlatformApi` port를 구현하고 `/me` strict mapper/fixture/component test 통과
- [x] AuthenticatedFetch와 session refresh coordinator를 real HTTP provider에 조합하고 403 non-retry와 malformed response fail-closed 검증
- [x] Keycloak `basic` subject/default scope와 `offline_access` optional scope를 realm JSON과 멱등 provisioning에 반영
- [x] clean Compose PKCE S256→JWT 검증→실제 `/me`→refresh-only restart→invalid token 401→logout/revocation smoke 통과
- [x] Android API 36 x86_64 Development Build 484 Gradle task와 browser callback route 검증
- [x] Android OS fingerprint prompt 뒤 실제 `/me`, force-stop/restart 뒤 SecureStore refresh→App Lock→`/me` 재검증
- [x] local logout 뒤 session/Query cache clear와 로그인 화면 복귀 확인
- [x] `GAP-0001`과 `FE-GAP-0003` 해결; 물리 기기 edge case/iOS는 기존 `GAP-0002`/`GAP-0003` 유지
- [x] 최종 root `npm run verify`: mobile 67/simulator 12/platform 61, 총 140 tests와 두 backend build 통과

## FE-0011 MyData와 Dashboard

- [x] canonical 10개 MyData/wealth operation의 strict authenticated adapter, fixture와 operation coverage 구현
- [x] connection 생성/조회, manual sync polling과 완료 후 관련 Query invalidation 구현
- [x] backend summary 기반 총자산, Accounts/detail/holdings/transactions/history/allocation 화면 구현
- [x] canonical decimal money·quantity formatter, masked account fail-closed와 `nextCursor: null` 계약 검증
- [x] loading/empty/stale/partial error/retry와 mutation error, synthetic disclaimer, 48px 이상 action, Reduce Motion chart 접근성 구현
- [x] mobile 26 files/75 tests와 local actual sync/wealth/order smoke 통과
- [x] Colima socket을 명시한 root `npm run verify`: mobile 75/simulator 12/platform 61, 총 148 tests와 두 backend build 통과

## FE-0012 Simulation

- [x] pre-submit draft만 Zustand에 보존하고 create mutation→persisted GET Query로 server result 표시
- [x] canonical money/duration/allocation validation과 ProblemDetails code 보존
- [x] strict simulation mapper의 exact version, 2~601 points와 p10≤p50≤p90 검증
- [x] goal probability/final p50, engine/assumption version, synthetic disclaimer 표시
- [x] p10/p50/p90 chart의 접근 가능한 month tooltip, 48px interaction과 Reduce Motion 설명
- [x] local actual create/get에서 12개월 13 points 재조회와 전체 wealth/order smoke 통과
- [x] root `npm run verify`: mobile 82/simulator 12/platform 61, 총 155 tests와 두 backend build 통과

## BE-0011 FE-0013 Contract Entry Repair

- [x] canonical Holding에 주문용 opaque UUID `instrumentId`를 additive로 추가
- [x] PostgreSQL wealth repository/provider fixture/mobile strict guard를 같은 contract로 갱신
- [x] Drizzle wrapped unique violation을 bounded cause-chain에서 식별해 duplicate connection 500을 canonical 409로 복구
- [x] Testcontainers duplicate conflict/instrument mapping과 actual local 409/sync/simulation/order smoke 통과

## FE-0013 BUY Order와 Recovery

- [x] canonical quote/order/history/status 4개 operation strict adapter와 fixture 구현
- [x] quote expiry 검증 뒤 local biometric success 전 submit 금지
- [x] 사용자 action별 UUID idempotency key와 mutation/AuthenticatedFetch POST no-retry 보장
- [x] UNKNOWN은 POST replay 없이 GET polling, FILLED 뒤 wealth/order exact invalidation
- [x] QUOTE_EXPIRED/INSUFFICIENT_FUNDS/IDEMPOTENCY_CONFLICT/UNKNOWN/REJECTED/FAILED UX
- [x] mobile 29 files/88 tests와 actual FILLED/REJECTED/UNKNOWN→FILLED smoke 통과
- [x] root `npm run verify`: mobile 88/simulator 12/platform 61, 총 161 tests와 두 backend build 통과

## FE-0014 Settings·Developer Scenario·접근성

- [x] logout, canonical current-user dataset/synthetic 안내와 설정 tab 구현
- [x] 자산·시뮬레이션·주문 화면과 차트 accessibility label의 금액 가리기
- [x] local/demo 명시 설정에서만 6개 simulator scenario와 deterministic reset 노출
- [x] 누락·미지·production app environment fail-closed과 developer UI 미노출 component test
- [x] developer PUT/bodyless POST strict HTTP adapter, mock/unavailable port, canonical consumer coverage 갱신
- [x] mobile architecture/lint/strict typecheck와 31 files/95 tests 통과
- [x] actual local scenario/reset·FILLED/REJECTED/UNKNOWN→FILLED smoke 통과
- [x] root `npm run verify`: mobile 95/simulator 12/platform 61, 총 168 tests와 두 backend build 통과

## 완료된 통합 기준선

- [x] root npm workspace와 통합 `package-lock.json`
- [x] Expo SDK 57 mobile architecture와 React Native component test
- [x] NestJS 12 + Fastify platform/simulator architecture
- [x] PostgreSQL 17.6, Drizzle versioned migration과 `finapp_` DB 객체 prefix
- [x] platform/simulator/Keycloak/migration role과 schema 격리
- [x] canonical OpenAPI 3.1 platform/simulator 계약
- [x] OIDC JWT issuer/audience/JWKS/scope 검증과 `/api/v1/me`
- [x] PKCE, access token memory, refresh token SecureStore, single-flight refresh
- [x] LocalAuthentication App Lock와 background timeout foundation
- [x] MyData sync/retry/lease/raw/normalization과 자산 조회 backend
- [x] deterministic Monte Carlo backend
- [x] BUY quote, idempotency와 row-lock fund reservation backend
- [x] root/CI formatter, contract, secret, architecture, lint, typecheck, test와 build gate
- [x] Docker build context와 backend workspace-scoped clean install

## DEV-0011 Clean Local MVP Acceptance

- [x] `make acceptance-test`로 local Compose volume 제거 후 clean `npm ci`·verify 재현
- [x] platform/simulator image build, forward migration, deterministic seed 2회, Compose health
- [x] actual Keycloak PKCE/login·JWT·`/me`·refresh restart·invalid token·logout/revocation
- [x] MVP 12단계: sync/raw/processing/wealth/chart API/simulation/BUY/settlement/idempotency/UNKNOWN reconciliation
- [x] DB 증거: raw 3, processed 3, single replay order, executions 2, ledger/position, audit 10
- [x] mobile 95/simulator 12/platform 61 총 168 tests와 두 backend build
- [x] 두 production image runtime audit vulnerability 0
- [x] `make` bootstrap/quality/unit/integration/concurrency/mobile/backend/infra/seed/reset/smoke/verify/acceptance 진입점 구현·검증
- [x] `GAP-0007` RESOLVED; iOS/physical-device와 Milestone 6A/6B 항목만 별도 유지

## DEV-0006 통합 검증

- [x] `npm ci` 통합 lockfile 재현
- [x] `npm run verify`: architecture, lint, strict typecheck, 113 tests와 두 backend build 통과
- [x] Expo Doctor 21/21 checks 통과
- [x] PostgreSQL Testcontainers migration/history/prefix/role isolation 통과
- [x] clean Compose platform history 6, simulator history 2
- [x] DB relation/constraint `finapp_` prefix 위반 0
- [x] platform↔simulator schema privilege 모두 false
- [x] simulator seed 2회 실행 후 동일 dataset 유지
- [x] platform/simulator health와 Keycloak discovery/PKCE redirect 확인
- [x] 실제 `/api/v1/me` 무인증 401 ProblemDetails/trace header 확인
- [x] production image build와 runtime dependency audit 0

## 외부 조건

다음은 Milestone 2~5와 단계 10까지의 local 개발을 막지 않는다.

- Lightsail DB 정보: 미제공
- AWS KMS 권한: 미제공
- 배포 domain과 TLS: 미제공
- Apple Developer/Google Play credential: 미확인
- 최신 iOS toolchain과 실제 생체인증 기기: 미확인

이번 실행에서는 원격 DB 사전 설정 검토, endpoint/credential 요청, 연결, catalog 조회, migration, seed와 배포를 모두 제외한다. 단계 10 완료 후 원격 작업 직전에 반드시 멈춘다. 자동 test는 local/Testcontainers PostgreSQL을 사용한다.

## Active Issue와 Gap

- `ISSUE-0002`: 통합 Expo dependency tree의 moderate advisory 14건
- `ISSUE-0003`: Drizzle Kit build-time dependency의 moderate advisory 4건
- `GAP-0002`: iOS Development Build runtime 검증
- `GAP-0003`: 실제 기기 biometric/background App Lock 검증

통합 `npm audit` 결과는 moderate 18, high 0, critical 0이다. 두 production backend image의 runtime workspace audit은 0이다.

## 다음 작업

1. `BE-0012`: settlement transaction outbox와 idempotent local publisher
2. 단계 10의 KMS/security/관측성/performance/문서 vertical slice를 순서대로 진행
3. 단계 10 완료 결과를 commit/push하고 Milestone 6B 원격 단계 전에 STOP
