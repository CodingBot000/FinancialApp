# 구현 상태

- 현재 Milestone: 2~5 — 단일 Main 로컬 MVP 통합
- 전체 상태: IN_PROGRESS
- 마지막 갱신: 2026-09-02
- 마지막 DEV ID: DEV-0008
- 다음 DEV ID: DEV-0009
- 활성 계획: `INTEGRATED_DEVELOPMENT_PLAN.md`

## 상태 표기

- `NOT_STARTED`: 시작하지 않음
- `IN_PROGRESS`: 구현 또는 검증 중
- `BLOCKED`: 외부 조건 없이는 진행 불가
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
| 3. 동기화와 Dashboard | IN_PROGRESS | backend sync/raw/derived/조회 완료; frontend Dashboard/Accounts/sync UX와 최소 audit 남음 |
| 4. 서버 시뮬레이션 | IN_PROGRESS | deterministic server simulation 완료; frontend 입력·결과 화면 남음 |
| 5. BUY 주문과 복구 | IN_PROGRESS | quote/idempotency/reservation 완료; simulator brokerage/scenario, settlement/reconciliation/audit와 frontend 주문 화면 남음 |
| 6. 하드닝과 원격 데모 | NOT_STARTED | KMS, Lightsail, HTTPS, EAS와 preview/demo release gate |

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

다음은 Milestone 2~5의 local/contract 개발을 막지 않는다.

- Lightsail DB 정보: 미제공
- AWS KMS 권한: 미제공
- 배포 domain과 TLS: 미제공
- Apple Developer/Google Play credential: 미확인
- 최신 iOS toolchain과 실제 생체인증 기기: 미확인

원격 migration, seed, 배포 또는 유료 resource 생성은 별도 사용자 승인 전 실행하지 않는다. 자동 test는 local/Testcontainers PostgreSQL을 사용한다.

## Active Issue와 Gap

- `ISSUE-0002`: 통합 Expo dependency tree의 moderate advisory 14건
- `ISSUE-0003`: Drizzle Kit build-time dependency의 moderate advisory 4건
- `GAP-0001`: live OIDC 로그인→refresh→`/me`와 native restart 검증
- `GAP-0002`: iOS Development Build runtime 검증
- `GAP-0003`: 실제 기기 biometric/background App Lock 검증
- `GAP-0004`: controller–OpenAPI–frontend mock/API 전체 계약 추적 미완료
- `GAP-0005`: simulator 시세·brokerage·scenario·reset/reseed 미구현
- `GAP-0006`: 로컬 MVP append-only 최소 audit event 미구현
- `GAP-0007`: 실제 전체 서비스 E2E와 fresh-clone 인수 명령 미완료

통합 `npm audit` 결과는 moderate 18, high 0, critical 0이다. 두 production backend image의 runtime workspace audit은 0이다.

## 다음 작업

1. `DEV-0009`: 모든 canonical operation의 provider/consumer 계약 추적과 CI gate
2. `BE-0009`: simulator 시세·brokerage·scenario·reset/reseed 경계
3. `BE-0010`: platform external submit, settlement, reconciliation, order 조회와 최소 audit
4. `FE-0010`: 현재 OpenAPI 기준 live OIDC `/me`와 authenticated adapter 통합
5. `FE-0011`~`FE-0014`: Dashboard/MyData, simulation, order, Settings/developer scenario
6. `DEV-0010`: local full-stack E2E와 fresh-clone 인수 후 Milestone 6 진행
