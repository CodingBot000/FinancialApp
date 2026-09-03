# MVP 범위

- 상태: 승인된 범위
- 작성일: 2026-09-01
- 목적: 개인 포트폴리오 프로젝트의 첫 완성 단위를 고정하고 범위 증가를 방지한다.

## 1. 제품 정의

`Wealth Sandbox`는 합성 금융 데이터와 가상 금융기관을 이용해 실제 모바일–API–DB–외부기관 연동 구조를 시연하는 기술 포트폴리오다.

실제 구현하는 것:

- React Native 모바일 앱
- OAuth2/OIDC 로그인과 서버 JWT 검증
- Node.js/TypeScript NestJS API와 PostgreSQL 영속화
- 별도 금융기관 simulator와 실제 HTTP 통신
- raw/derived 데이터 경계
- 서버 기반 자산 집계와 시뮬레이션
- BUY 주문의 멱등성, 현금 예약, settlement와 reconciliation
- 한국투자증권 KIS 시장 데이터 provider adapter와 종목/시세 cache
- 로컬 생체인증 app lock
- 테스트와 배포 자동화

합성 또는 가상인 것:

- 사용자와 금융 데이터
- 계좌, 기관, 상품, 시세
- 마이데이터 전송
- 주문 접수와 체결
- 시뮬레이션 가정

## 2. 로컬 MVP에 포함

### 모바일

- Expo Development Build
- iOS와 Android 빌드 가능한 구성
- OIDC Authorization Code + PKCE 로그인
- SecureStore와 access token 메모리 보관
- app lock 및 주문 전 LocalAuthentication
- 포트폴리오용 4페이지 소개, 가입 UI, PIN 확인과 기기 생체인증 진입 흐름
- 최초 생체인증 완료 상태의 SecureStore 보존과 재실행 시 onboarding 생략
- TanStack Query 서버 상태
- Zustand UI/draft 상태
- Dashboard, Accounts, Simulation, Order, Settings 화면
- 종목 검색, 현재가와 기간별 가격 차트를 제공하는 `시장` 탭
- 총자산 추이, 자산배분, p10/p50/p90 차트
- loading, empty, error, retry UX
- Reduce Motion 기본 고려

### 플랫폼 API

- Node.js 24 LTS, TypeScript strict와 NestJS modular monolith
- Fastify adapter와 OAuth2/OIDC Resource Server JWT 검증
- PostgreSQL과 Drizzle ORM/Kit migration
- `/me`
- 단일 가상기관 connection과 수동 sync
- immutable raw ingestion과 normalization
- 자산 summary/accounts/holdings/history
- deterministic simulation
- BUY market order preview와 submit
- idempotency, 현금 예약, settlement, UNKNOWN reconciliation
- audit event 최소 구현
- OpenAPI와 표준 오류 응답
- health와 correlation ID
- KIS 종목 마스터, 현재가, 분봉/일봉/주봉/월봉/연봉 조회 API

### Simulator

- 별도 NestJS + Fastify process
- 별도 DB role과 `finapp_simulator` schema
- 단일 가상기관
- `BALANCED_WORKER` deterministic preset
- 계좌, 보유자산, 거래내역, 시세, 주문 API
- NORMAL, TIMEOUT, HTTP_500, MALFORMED_RESPONSE, ORDER_REJECT, ORDER_UNKNOWN_THEN_FILLED
- clientOrderId 중복 방지
- reset/reseed

### 테스트

- 핵심 domain unit test
- Vitest와 Testcontainers for Node.js PostgreSQL integration test
- 실제 simulator container integration test
- 인증·소유권 test
- 중복 idempotency와 현금 oversubscription concurrency test
- 모바일 component/network orchestration test
- 최소 smoke test

## 3. 로컬 MVP에서 제외하고 Milestone 6으로 이동

- 실제 AWS KMS 연결
- Lightsail Managed PostgreSQL
- Nginx/HTTPS 원격 배포
- EAS Preview Build 배포 결과
- scheduled MyData sync
- DB outbox publisher
- 다기관 동기화와 기관별 부분 실패 UX
- production 수준 감사로그 보관정책
- 전체 관측성 dashboard
- iOS와 Android 실제 기기 모두의 수동 검증

이 항목들은 최종 포트폴리오에는 필요하지만 로컬 E2E 완성을 막지 않는다.

## 4. 명시적으로 제외

- SELL, limit order, partial fill, cancel order
- 실제 금융기관 계좌/마이데이터 API와 실제 주문
- 실제 개인정보와 실제 계좌번호
- 투자 추천 또는 수익 보장 표현
- push notification
- SSE/WebSocket
- 모바일 오프라인 금융 원장
- 관리자 웹 콘솔
- Kafka, Kubernetes, 마이크로서비스 분해
- app attestation, pinning, 위변조 방지 솔루션
- App Store와 Google Play 정식 공개

Milestone 6 재확정에서 제외한 onboarding wizard는 투자성향·추천 결과를 만드는 업무
onboarding을 뜻한다. 이후 추가된 포트폴리오 소개·본인인증 UI·PIN·기기 생체인증은
화면 시연용 launch flow이며 규칙 기반 portfolio recommendation을 생성하지 않는다.
OIDC 첫 로그인에서 합성 기본 risk profile을 자동 생성하고 Settings에서 위험 선호·기간·
월 납입액을 owner-scoped/versioned하게 편집하는 planning preference 경계는 그대로
유지한다.

## 5. 로컬 MVP E2E 인수 시나리오

1. 사용자가 Keycloak 테스트 계정으로 로그인한다.
2. API가 issuer, audience, scope를 검증하고 `/me`를 반환한다.
3. 사용자가 단일 가상기관 sync를 요청한다.
4. platform-api가 simulator를 HTTP로 호출한다.
5. raw payload와 processing result가 저장된다.
6. 계좌와 보유자산이 정규화되고 자산 summary가 갱신된다.
7. 모바일 Dashboard가 PostgreSQL 기반 자산과 차트를 표시한다.
8. 사용자가 simulation을 실행하고 서버가 p10/p50/p90을 반환한다.
9. 사용자가 BUY 주문을 미리 보고 local biometric gate를 통과한다.
10. 주문이 체결되고 cash, position, execution, audit가 갱신된다.
11. 같은 idempotency key를 재사용해도 주문은 하나다.
12. UNKNOWN 시나리오에서는 POST를 반복하지 않고 reconciliation으로 FILLED가 된다.

## 6. MVP 완료 정의

다음 조건을 모두 만족해야 로컬 MVP 완료로 표시한다.

- E2E 시나리오 12단계 성공
- fresh clone 실행 절차 문서화
- 모든 자동 품질 게이트 통과
- 실제 미검증 항목이 정확히 구분됨
- 합성 데이터 경계와 disclaimer 표시
- secret과 실제 개인정보가 저장소에 없음
- `IMPLEMENTATION_STATUS.md`가 실제 결과와 일치

DEV-0011에서 `make acceptance-test`로 빈 local Compose volume부터 위 12단계를 재현했다. 결과는 PKCE/`/me`/refresh/logout, raw 3건·processed 3건, 계좌/transaction/history, 13-point persisted simulation, FILLED/REJECTED/UNKNOWN→FILLED, 동일 key replay 단일 주문, execution 2건·audit 10건과 production image runtime audit 0을 포함했다. 자동 인수가 대체하지 않는 iOS·물리 biometric 검증은 별도 gap으로 남겨두었다.

DEV-0014에서 같은 clean 인수를 migration history 10개, mobile 97/simulator 12/platform 80 총 189 tests와 runtime-role query plan gate까지 확장해 재검증했다. 최종 결과는 `acceptance=passed`, `clean=true`, `scenarioSteps=12`, `remoteResourcesUsed=false`다.
