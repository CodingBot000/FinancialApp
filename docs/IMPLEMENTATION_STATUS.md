# 구현 상태

- 현재 Milestone: 7C — WM 코치 경험
- 전체 상태: IN_PROGRESS
- 마지막 갱신: 2026-09-04
- 마지막 로컬 구현 ID: FE-0027
- 다음 작업 ID: FE-0019/FE-0020 물리 기기 검증 / FE-0017 iOS 회귀
- 활성 계획: `COACH_EXPERIENCE_IMPLEMENTATION_SPEC.md`
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
| 6A. 로컬 하드닝 | DONE | outbox, envelope crypto/KMS 경계, security/log, readiness/metrics/resilience, profile, query/dependency gate, 최종 문서와 clean acceptance 완료 |
| 7C. WM 코치 경험 | DONE | 결정적 client-only 진단·간이 성향 진단·제안 simulation·화면 로컬 상담, Android API 36와 최종 root verify 완료 |
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

## BE-0012 Transactional Outbox

- [x] FILLED/REJECTED/최대 reconciliation FAILED settlement transaction에 redacted `ORDER_SETTLED` event 원자적 기록
- [x] `0007_finapp_outbox` event/lease/index와 insert-only durable delivery receipt, 모든 object `finapp_` prefix
- [x] `SKIP LOCKED` claim, stale lease 회수, bounded backoff/max-attempt와 event/consumer 중복 억제
- [x] publisher 실패 inline retry 금지와 publish-success/complete-failure crash window 재처리 단위·PostgreSQL 검증
- [x] Testcontainers migration 8 tests와 actual local OIDC/business smoke의 processed event/delivery 3건 통과
- [x] root verify: mobile 95/simulator 12/platform 64 총 171 tests와 두 backend build 통과
- [x] `ISSUE-0012`, `BE-ISSUE-0004`, `BE-ISSUE-0005`를 같은 slice에서 수정·재검증
- [x] 원격 DB/endpoint/credential/migration/deploy 미사용

## BE-0013 Local Envelope Crypto와 AWS KMS 경계

- [x] async `DataKeyProvider` port와 local/AWS KMS infrastructure adapter 분리
- [x] random per-value DEK, AES-256-GCM wrapped-DEK `FAE2` envelope와 owner/schema/table/column AAD
- [x] local stable HMAC lookup과 AWS KMS 별도 HMAC `GenerateMac` 경계
- [x] plaintext DEK use-after zero-fill, tamper/wrong AAD/wrong profile fail-closed
- [x] pre-envelope synthetic ciphertext는 local/test read-only 호환, demo/production 거부
- [x] AWS SDK adapter와 fake-client contract를 연결하고, 실제 AWS credential/endpoint/KMS 호출은 remote 검증 전까지 미사용
- [x] Testcontainers 신규 envelope와 보존 Compose legacy-read actual smoke 통과
- [x] `BE-ISSUE-0006` strict test type failure 해결·재검증
- [x] root verify: mobile 95/simulator 12/platform 68 총 175 tests와 두 backend build 통과

## BE-0014 Security Event와 Structured Log

- [x] migration `0008_finapp_security_event`, 모든 schema/table/index/constraint/history `finapp_` prefix
- [x] authn/authz 실패 stable reason, trace, keyed source IP hash와 allowlist metadata append-only 저장
- [x] token/subject/raw IP 미저장, runtime security event UPDATE/DELETE 거부
- [x] query/header/body를 입력받지 않는 allowlist JSON HTTP completion log와 안전 trace header
- [x] actual production AppModule bootstrap의 developer route 404/route tree 미등록
- [x] `BE-ISSUE-0007` AuditModule DI scope defect 해결·재검증
- [x] Testcontainers migration 9 tests와 local Compose security event 1건/structured logs/12단계 smoke 통과
- [x] root verify: mobile 95/simulator 12/platform 71 총 178 tests와 두 backend build 통과
- [x] 원격 DB/credential/deploy 미사용

## BE-0015 Readiness, Metrics와 Circuit Breaker

- [x] bounded DB `SELECT 1` readiness와 stable canonical 200/503 response
- [x] private monitoring ingress 전용 고정 JSON HTTP/circuit counter와 DB pool gauge
- [x] MyData/market/brokerage simulator adapter closed/open/half-open circuit breaker
- [x] open circuit의 quote preview canonical `503 UPSTREAM_CIRCUIT_OPEN`
- [x] brokerage order POST 자동 retry·open 상태 전송 금지 request-count 검증
- [x] canonical 계약 33 operations·36 fixtures/provider/consumer/compatibility gate 통과
- [x] platform architecture/lint/typecheck와 16 files/77 tests 통과
- [x] root verify: mobile 95/simulator 12/platform 77 총 184 tests와 두 backend build 통과
- [x] actual Compose DB readiness/metrics와 OIDC 포함 12단계 smoke 통과
- [x] `BE-ISSUE-0008` readonly counter type defect 해결·재검증
- [x] DB migration과 원격 DB/endpoint/credential/deploy 미사용

## DEV-0012 Risk Profile 범위 재확정과 편집

- [x] 별도 onboarding wizard와 portfolio recommendation은 명시적 제외 유지
- [x] OIDC 기본 합성 profile + Settings owner-scoped 조회/수정으로 onboarding 범위 종료
- [x] GET `financial.read`, PUT `financial.write`, conditional version update와 400/409
- [x] mobile exact response guard, PUT adapter와 accessible Settings 편집/no-advice 문구
- [x] canonical 계약 35 operations·38 fixtures/provider/consumer/compatibility gate 통과
- [x] PostgreSQL owner/version 0→1 및 stale update 무효, actual OIDC GET→PUT version 증가 통과
- [x] root verify: mobile 97/simulator 12/platform 80 총 189 tests와 두 backend build 통과
- [x] `BE-ISSUE-0009`, `FE-ISSUE-0011` 해결·재검증
- [x] DB migration과 원격 작업 미사용

## DEV-0013 Query Plan과 Dependency Release Gate

- [x] actual PostgreSQL runtime role로 asset/holding/order/reconciliation 4개 JSON plan 검증
- [x] expected `finapp_` index와 local 100ms ceiling 자동 gate `make performance-test`
- [x] `0009_finapp_order_list_index`로 exact `(user_id, created_at DESC, id DESC)` keyset index
- [x] 주문 plan의 Incremental Sort 제거, 수정 직후 1.126ms·최종 1.524ms; 최종 네 plan 0.228~1.524ms
- [x] 빈 Testcontainers migration 10개 history/prefix/권한과 보존 Compose forward migration 통과
- [x] registry stable: Expo 57.0.19, Router 57.0.18, Drizzle Kit 0.31.10/ORM 0.45.2 현재 pin과 일치
- [x] root audit moderate 18/high 0/critical 0, platform/simulator production workspace audit 각각 0
- [x] local release 조건부 통과; `ISSUE-0002`/`ISSUE-0003`은 원격 preview 전 해소 또는 사용자 위험 수용 필요
- [x] `GAP-0009` 해결, 원격 DB/endpoint/credential/catalog/migration/seed/deploy 미사용

## DEV-0014 최종 로컬 하드닝과 포트폴리오 인수

- [x] architecture/sequence/security/limitations/requirements traceability/3분 demo 문서 완성
- [x] clean acceptance에 runtime-role query plan gate 포함
- [x] 전용 local Compose volume 제거 후 `npm ci`, root verify, 두 production image build
- [x] 빈 PostgreSQL platform migration history 10개, simulator migration과 deterministic seed 2회
- [x] actual PKCE/JWT/refresh/logout/risk-profile와 12단계 sync/simulation/order/reconciliation smoke
- [x] clean plan 0.213/0.308/0.357/0.348ms, expected `finapp_` index와 100ms ceiling 통과
- [x] mobile 97/simulator 12/platform 80 총 189 tests, 두 backend build/runtime audit 0
- [x] 최종 `acceptance=passed`, `clean=true`, `scenarioSteps=12`, `remoteResourcesUsed=false`
- [x] 원격 DB/endpoint/credential/catalog/migration/seed/deploy 미사용

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

## FE-0015 모바일 고객 UI 디자인 리팩터링 — 진행 상태

- [x] Wealth Flow 독립 브랜드 모듈과 light-first 토큰/공통 primitive 추가
- [x] 홈·종목·플랜·내 정보 4개 bottom tab 및 주문 stack route 추가
- [x] 로그인/App Lock/자산/시세/시뮬레이션/주문/내 정보 화면을 공통 컴포넌트로 전환
- [x] 금액 숨김, 상태 chip, demo disclosure와 접근성 메시지 유지
- [x] 자산·시뮬레이션·시세 차트를 line/area 상호작용과 Reduce Motion 기준으로 갱신
- [x] feature UI/app route raw hex·금지 고객 문구 검사 스크립트 추가
- [x] app.json 표시 이름을 Wealth Flow로 변경하고 light UI 고정 (scheme/package identifier 유지)
- [x] 공통 primitive strict typecheck 실패 ISSUE-0013/FE-ISSUE-0012를 수정·검증
- [x] mobile lint/typecheck와 35 files/104 tests 통과
- [x] 다음 FE-0016: navigation/export smoke와 디자인 회귀 검증 보강

## FE-0016 종목 상세 route와 navigation smoke — 진행 상태

- [x] 종목 검색 결과에서 종목 상세 stack route(`/market/[symbol]`)로 이동
- [x] 상세 route의 현재가·변동·가격 흐름·stale/empty/error 상태를 공통 primitive로 구현
- [x] 뒤로 가기와 알 수 없는 종목의 고객용 빈 상태를 검증
- [x] 필수 Expo route 파일·4개 bottom tab label·Wealth Flow/light 설정을 검사하는 `route:check` gate 추가
- [x] Node 24 + mobile workspace 조건의 Expo web export 재검증
- [x] mobile 36 files/106 tests, route/design/architecture/lint/typecheck 통과
- [x] local Docker wrapper의 root `make verify` 전체 gate 통과
- [ ] 다음 FE-0017: iOS/Android native 화면 회귀 확인 (환경 제공 시)

## FE-0017 iOS/Android native 화면 회귀 — 진행 상태

- [ ] iOS simulator build/run 및 화면 snapshot
- [x] Android API 36 emulator build/run 및 종목 차트 screenshot
- [ ] native 환경 blocker `ISSUE-0017`/`FE-ISSUE-0016` 해결 후 재검증
- 상태: PARTIAL — Android 완료, Xcode SDK 18.2에 대응하는 eligible iOS Simulator destination은 여전히 없음

## FE-0018 종목 차트와 local market data 복구 — 진행 상태

- [x] Victory Native `CartesianChart` timestamp X축/compact price Y축/grid 적용
- [x] `Area y0={chartBounds.bottom}`, `monotoneX` Line/Area와 selected point 적용
- [x] 실제 chart press에 따른 날짜·종가·OHLC·거래량 tooltip 확인
- [x] 현재가/전일대비/등락률/거래량 2열 요약과 bars 개수/최근 봉 정보 표시
- [x] local/KIS logical bucket normalization과 service/repository 방어적 dedupe
- [x] local deterministic 5 interval series와 mock 5 interval 지원
- [x] local repair CLI dry-run/execute guard와 duplicate 0 재검증
- [x] platform 재시작 2회 뒤 DAILY DB/API 120개 불변
- [x] Android에서 분120/일120/주156/월120/년40 전환 확인
- [x] root verify: mobile 109/simulator 12/platform 96 tests와 backend build 통과
- [x] 원격 DB/credential/migration/deploy 미사용

## FE-0019 포트폴리오 생체인증 온보딩·재실행 — 진행 상태

- [x] `expo-device@57.0.1`과 `Device.isDevice` 기반 physical/non-physical gate 선택
- [x] PIN 완료 뒤 biometric setup 성공 시에만 SecureStore marker 저장
- [x] force-stop/relaunch 시 onboarding/본인인증/PIN 생략 후 biometric unlock
- [x] 현재 process unlock은 메모리 전용이며 background 60초 뒤 재인증
- [x] 포트폴리오 성공 경로에서 OIDC configuration 화면 우회
- [x] fake OIDC token 없이 `ContractMockPlatformApi` Home 표시
- [x] 생체 미등록·취소·실패·timeout·lockout·저장 실패 UX와 retry
- [x] Android API 36 Emulator clean 첫 흐름과 force-stop/relaunch smoke
- [x] Android Debug Development Build 484 Gradle tasks 통과
- [x] mobile dependency/architecture/route/design/lint/typecheck와 46 files/136 tests 통과
- [x] root verify: 38 operations/41 fixtures, mobile 136/simulator 12/platform 96
      총 244 tests와 두 backend build 통과
- [ ] Android/iOS 물리 기기의 실제 prompt, cancel, lockout, enrollment 변경 검증
- 상태: PARTIAL — local code/Android Emulator 완료, physical/iOS evidence 대기

## FE-0020 launch native 선택 권한 요청 — 진행 상태

- [x] `expo-notifications`, `expo-image-picker`, `expo-camera` SDK 57 모듈 추가
- [x] 알림 → 사진 → 카메라 순차 permission coordinator 구현
- [x] 이미 결정된 권한은 skip하고 요청 가능한 미결정 권한만 native 요청
- [x] 승인·거부·개별 adapter 오류와 무관하게 다음 권한과 onboarding 진행
- [x] 기존 안내 확인과 분리된 permission handled SecureStore marker 추가
- [x] marker 존재 시 custom 안내와 OS 권한 요청 모두 생략
- [x] Android 13+ 알림 prompt용 notification channel 선생성
- [x] 카메라/사진 iOS usage description과 Android runtime permission config 반영
- [x] Android API 36 Emulator에서 알림·카메라 거부 후 onboarding 진행 확인
- [x] force-stop/relaunch에서 권한 화면 재표시 없음 확인
- [x] mobile 48 files/141 tests와 Android Development Build 484 tasks 통과
- [x] root verify: mobile 141/simulator 12/platform 96 총 249 tests와 두 backend build
- [ ] iOS 및 Android/iOS 물리 기기 native prompt 수동 확인
- 상태: PARTIAL — Android Emulator 완료, physical/iOS evidence 대기

## FE-0021 내 정보 overview와 관리 route — 진행 상태

- [x] `내 정보` tab에서 공통 상·하단 바를 포함한 overview 구성
- [x] overview에서 WM 로고·알림함 상단바와 홈·종목·주문·플랜·내 정보 하단바 표시
- [x] `내 정보 관리`만 기존 투자성향·계정 관리 화면으로 root stack 이동
- [x] 관리 화면은 overview와 분리된 global app header/bottom tab bar 없는 full-screen route로 표시
- [x] 자동로그인/생체인증 switch의 local visual toggle 구현
- [x] 알림·간편비밀번호·공지·문의·브랜드 row에 no-op press handler 등록
- [x] 기존 top bar의 `icon-wm.png`를 WM 브랜드 row에 재사용
- [x] Android Emulator screenshot full/focused design QA 통과
- [x] mobile 49 files/142 tests, route 12 files, design-system 40 UI files 통과
- 상태: DONE local visual implementation; source device chrome 차이는 의도된 범위

## FE-0024 내정보 탭 공통 navigation chrome 복원 — 진행 상태

- [x] `내 정보` 탭 선택 시 공통 WM 로고·알림함 상단바 표시
- [x] `내 정보` 탭 선택 시 공통 홈·종목·주문·플랜·내 정보 하단 내비게이션 표시
- [x] overview를 탭용 `Screen` safe-area/content 레이아웃으로 전환
- [x] root stack의 관리·알림 설정 full-screen route에는 공통 navigation chrome 미표시 유지
- [x] Android Emulator에서 내정보 탭의 상·하단 바 노출 및 route 진입 회귀 확인
- 상태: DONE local navigation chrome behavior

## FE-0026 원화 입력 화면 정수 표시 — 진행 상태

- [x] 목표 자산 미리보기의 시작 자산·월 납입액·목표 금액 기본값에서 `.0000` 제거
- [x] 내 정보 관리의 월 납입액 API 값을 화면용 원 단위 정수로 변환
- [x] 원화 입력 필드를 `number-pad`와 원 단위 정수 검증으로 통일
- [x] 자산·시세·주문·시뮬레이션 결과의 기존 `MoneyValue`/`formatWon` 정수 표시 유지
- [x] 주식 수량의 소수점 정밀도와 API·DB canonical decimal 표현은 유지
- 상태: DONE local KRW display/input formatting

## FE-0022 알림 설정 full-screen route — 진행 상태

- [x] `내 정보` overview의 `알림 설정` row를 root stack route로 연결
- [x] global top/bottom app bar 없는 알림 설정 full-screen layout 구현
- [x] 서비스 이용 알림 ON, 혜택·앱 푸시·알림톡/문자·전화 OFF 기본 상태 반영
- [x] 첨부 기준 copy, 안내 배너, switch, 마케팅 동의 버튼과 로컬 이벤트 구현
- [x] switch 우측 정렬 및 동의 버튼의 레퍼런스 기준 높이·간격 반영
- [x] Android Emulator에서 알림 설정 진입·스위치 toggle·뒤로가기 확인
- [x] source/implementation side-by-side 및 focused design QA 재실행
- [x] mobile 50 files/144 tests, route 13 files, design-system 42 UI files 통과
- 상태: DONE local visual implementation; notification preference persistence/backend는 범위 외

## FE-0023 재활용 가능한 뒤로가기 포함 full-screen template — 진행 상태

- [x] 온보딩 전용 `FullScreenSurface`와 앱 페이지용 `FullScreenPage` 레이아웃 분리
- [x] `FullScreenPage`에 safe area, 고정 back action, 중앙 title, scroll content 지원
- [x] `내 정보 관리`와 `알림 설정`을 공통 full-screen page template으로 전환
- [x] 알림 설정의 header height는 공통 64로 고정하고 title style·content spacing만 화면별로 보존
- [x] Android Emulator에서 두 페이지의 상단 `뒤로가기` 노출과 복귀 동작 확인
- [x] mobile 50 files/144 tests, route 13 files, design-system 42 UI files 통과
- 상태: DONE local reusable layout; onboarding backless surface와 app-owned back page 분리 완료

## FE-0027 WM 코치 경험 — 진행 상태

- [x] 기존 플랜 탭을 코치 탭으로 교체하고 기존 simulation을 root `/plan` 전체 화면으로 이동
- [x] 기존 `AssetSummary`와 `UserRiskProfile`을 병렬 조회해 순수 규칙으로 대표 진단과 현재/제안 배분 비교 파생
- [x] 안정형 20/50/30, 균형형 10/30/60, 성장형 5/15/80을 shared planning preset 하나로 통합
- [x] 3문항 간이 진단에서 기존 monthly contribution/version을 유지한 `updateRiskProfile` 저장과 cache 즉시 갱신
- [x] 현재 성향의 동일 preset을 목표 자산 미리보기 화면과 `createSimulation` input에 전달
- [x] Calendar 예약 가능일·disabled일 표시, 날짜별 오전·오후·저녁 slot, 전화/화상·완료를 component local state로 처리하는 상담 demo 구현
- [x] 홈·종목·코치·주문 최초 진입에만 adaptive skeleton을 표시하고 내 정보 탭은 제외
- [x] skeleton 방문 상태는 process-memory provider가 소유해 재방문에는 숨기고 앱 프로세스 재시작 시 초기화
- [x] architecture 240 files, route 16 files, design-system 51 UI files와 mobile typecheck 통과
- [x] mobile Vitest 63 files/202 tests, canonical contract 38 operations/41 fixtures 통과
- [x] Android API 36 arm64 Emulator Development Build 484 Gradle tasks와 시나리오 A~D 화면 검증 통과
- [x] Android 홈·종목·주문·내 정보 탭 smoke와 runtime crash/error 0 확인
- [x] 탭 전환·현재 탭 재선택 시 화면 상태를 유지하면서 ScrollView만 상단으로 복귀하는 Android smoke 통과
- [x] Android에서 최초 탭 skeleton, 재방문 미표시, 내 정보 제외와 프로세스 재시작 후 재표시 확인
- [x] 신규 backend API, OpenAPI operation, DB schema/migration과 전역 store 없음
- [x] 최종 root `npm run verify`: mobile 195/simulator 12/platform 97, 총 304 tests와 두 backend build 통과
- 상태: DONE local — 최초 진입 skeleton 자동·Android 검증과 최종 root verify 완료

## 외부 조건

다음은 완료된 Milestone 2~5와 단계 10 local 결과의 외부 미검증 범위다.

- Lightsail DB 정보: 미제공
- AWS KMS 권한: 미제공
- 배포 domain과 TLS: 미제공
- Apple Developer/Google Play credential: 미확인
- 최신 iOS toolchain과 실제 생체인증 기기: 미확인

이번 실행에서는 원격 DB 사전 설정 검토, endpoint/credential 요청, 연결, catalog 조회, migration, seed와 배포를 모두 제외했다. 단계 10 완료 commit/push 뒤 여기서 멈추며, 자동 test는 local/Testcontainers PostgreSQL만 사용했다.

## Active Issue와 Gap

- `ISSUE-0002`: 통합 Expo dependency tree의 moderate advisory 14건
- `ISSUE-0003`: Drizzle Kit build-time dependency의 moderate advisory 4건
- `GAP-0002`: iOS Development Build runtime 검증
- `GAP-0003`: 실제 기기 biometric/background App Lock 검증

통합 `npm audit` 결과는 moderate 18, high 0, critical 0이다. 두 production backend image의 runtime workspace audit은 0이다.

## 다음 작업

1. 현재 실행은 단계 10 완료 commit/push 후 종료한다.
2. 단계 11 원격 DB·KMS·HTTPS/EAS 작업은 새 사용자 요청과 당시의 별도 승인 계획 없이는 시작하지 않는다.
3. 과거 원격 migration 승인은 재사용하지 않는다.
