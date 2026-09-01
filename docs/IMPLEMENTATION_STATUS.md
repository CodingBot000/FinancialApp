# 구현 상태

- 현재 Milestone: 2~5 — 단일 Main 로컬 MVP 통합
- 전체 상태: IN_PROGRESS
- 마지막 갱신: 2026-09-02
- 마지막 완료 ID: BE-0010
- 다음 작업 ID: FE-0010
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
| 2. OIDC와 App Lock | IN_PROGRESS | backend JWT·`/me`, frontend PKCE/session/App Lock 완료; live OIDC `/me`·restart·실기기 검증 남음 |
| 3. 동기화와 Dashboard | IN_PROGRESS | backend sync/raw/derived/조회와 최소 audit 완료; frontend Dashboard/Accounts/sync UX 남음 |
| 4. 서버 시뮬레이션 | IN_PROGRESS | deterministic server simulation 완료; frontend 입력·결과 화면 남음 |
| 5. BUY 주문과 복구 | IN_PROGRESS | backend quote/reservation/simulator/settlement/reconciliation/audit 완료; frontend 주문 화면과 전체 E2E 남음 |
| 6A. 로컬 하드닝 | NOT_STARTED | outbox, local KMS adapter 경계, security event/관측성, 최종 포트폴리오 문서 |
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
- `GAP-0001`: live OIDC 로그인→refresh→`/me`와 native restart 검증
- `GAP-0002`: iOS Development Build runtime 검증
- `GAP-0003`: 실제 기기 biometric/background App Lock 검증
- `GAP-0007`: 실제 전체 서비스 E2E와 fresh-clone 인수 명령 미완료

통합 `npm audit` 결과는 moderate 18, high 0, critical 0이다. 두 production backend image의 runtime workspace audit은 0이다.

## 다음 작업

1. `FE-0010`: 현재 OpenAPI 기준 live OIDC `/me`와 authenticated adapter 통합
2. `FE-0011`~`FE-0014`: Dashboard/MyData, simulation, order, Settings/developer scenario
3. `DEV-0011`: local full-stack E2E와 fresh-clone 인수 후 Milestone 6A local hardening 진행
4. 단계 10 local hardening 완료 결과를 commit/push하고 Milestone 6B 원격 단계 전에 STOP
