# 테스트 전략

- 상태: MVP 실행 기준선
- 작성일: 2026-09-01

## 1. 원칙

- 테스트는 원격 Lightsail DB를 사용하지 않는다.
- 원격 Lightsail에서는 별도의 승인된 migration/role/TLS/E2E smoke만 실행하고 자동 test suite의 test data source로 사용하지 않는다.
- DB integration test는 `@testcontainers/postgresql`을 사용한다.
- 시간은 주입된 `Clock`, random은 명시적 seed를 사용한다.
- 테스트 간 데이터와 scenario는 독립적이어야 한다.
- backend test runner는 Vitest를 사용하고 `tsc --noEmit`을 별도 gate로 실행한다.
- mock HTTP test만으로 외부기관 연동 완료를 주장하지 않는다. 실제 simulator container suite가 필요하다.
- 자동화할 수 없는 생체인증과 signing은 수동 검증으로 분리한다.
- 실패한 test나 미실행 test를 완료로 표시하지 않는다.

## 2. 테스트 계층

### Backend unit

- portfolio aggregation과 반올림
- normalization mapping
- checksum canonicalization
- sync/order 상태 전이
- simulation deterministic 결과와 property
- idempotency request hash
- 현금 예약/해제/settlement
- reconciliation decision
- ownership policy
- encryption roundtrip와 wrong AAD

Nest application context 없이 실행 가능한 Vitest domain test를 우선한다.

### Backend architecture

- dependency-cruiser로 module cycle, internal deep import와 허용되지 않은 module/layer dependency 검사
- ESLint로 controller → Drizzle/repository 직접 의존, domain → Nest/Fastify/Drizzle 의존을 조기에 차단
- Nest module은 필요한 provider만 `exports`에 공개하며 `@Global()` 업무 module을 금지
- platform production source가 simulator package를 import하지 않는지 검사
- architecture violation ignore는 만료 조건이 있는 issue/gap과 ADR 없이는 금지

### Backend integration

Testcontainers for Node.js PostgreSQL 사용:

- 빈 database에 Drizzle versioned migration 적용
- Drizzle schema mapping과 query
- unique/check/foreign key constraint
- raw immutable 권한 또는 application rule
- raw → derived normalization
- transaction rollback
- cash row lock concurrency
- duplicate idempotency concurrency
- settlement duplicate execution
- reconciliation job claim
- audit append-only 권한
- DB role isolation

### External integration

platform-api와 실제 institution-simulator를 실행한다.

- 정상 account/holding/transaction sync
- TIMEOUT
- HTTP_500
- MALFORMED_RESPONSE
- ORDER_REJECT
- ORDER_UNKNOWN_THEN_FILLED
- duplicate clientOrderId

HTTP adapter mock은 세부 client unit test에 사용할 수 있지만 이 suite를 대체하지 않는다.

### Security

- valid token
- expired token
- wrong issuer/audience
- missing scope
- 다른 사용자 resource
- production dev endpoint 404
- token/log redaction
- encrypted field plaintext 검색 실패

### Mobile unit/component

- money/date formatter
- Zustand draft와 UI preference selector
- Query loading/empty/error rendering
- sync polling 종료 조건
- 401 refresh single-flight
- refresh 실패 logout
- Query cache clear
- order UNKNOWN 상태에서 POST retry 없음
- biometric adapter 결과 분기
- Reduce Motion 분기

### Mobile architecture

- `shared`가 `features` 또는 `app`을 import하지 않는지 검사
- route가 API transport, store implementation과 feature internal file을 직접 import하지 않는지 검사
- feature 간 cycle과 공개 `index.ts` 밖의 deep import 검사
- TanStack Query server state를 Zustand에 복제하지 않는지 review와 targeted test로 확인

### Frontend contract mock

- frontend mock/API client가 지정된 canonical OpenAPI commit revision을 사용
- 모든 현재 operation이 `contracts/operation-coverage.yaml`에서 provider test와 consumer fixture/adapter 상태로 추적됨
- 모든 operation 성공 fixture와 주요 ProblemDetails가 OpenAPI response schema validation 통과
- 고정 seed와 `datasetVersion`으로 fixture 재현
- loading, empty, partial, timeout, 401, 403/404와 5xx 상태 검증
- money/quantity decimal string과 enum이 실제 계약과 일치
- mock adapter와 real HTTP adapter가 같은 application API port를 구현
- backend 준비 후 동일 consumer contract를 실제 API에 실행

### Contract compatibility와 provider trace

- controller의 실제 method/path와 canonical OpenAPI operation을 양방향 대조
- 각 operation의 controller handler, provider test와 consumer target 누락 시 실패
- 모든 문서화된 response status에 JSON schema가 없으면 실패
- 실제 Fastify 성공 응답과 주요 400/401/403 ProblemDetails를 canonical response schema로 검증
- compatibility baseline의 기존 path/status/schema/property 제거 또는 이동 시 실패
- root `contract:check`와 CI contracts job은 같은 validator를 실행

### Mobile E2E

자동화 범위:

- 테스트 로그인 또는 test IdP adapter
- Dashboard
- manual sync와 완료 polling
- simulation
- order preview와 submit
- order history/status
- logout

실제 OIDC 브라우저와 생체인증은 실제 기기 체크리스트로 별도 기록한다.

## 3. 핵심 동시성 Scenario

### 현금 초과 예약

- 초기 available: 1,000,000 KRW
- 동시에 800,000 KRW 주문 두 개
- 성공 reservation은 하나
- 다른 주문은 `ORDER_INSUFFICIENT_FUNDS`
- available/reserved는 음수가 아님
- 합계가 보존됨

### 동일 idempotency key

- 같은 user, operation, key, payload 요청 20개 동시 실행
- order row 하나
- reservation 하나
- 모든 성공 응답은 같은 order ID

### reconciliation 중복 실행

- 같은 UNKNOWN order job을 worker 두 개가 claim 시도
- 하나만 외부 status query/settlement 수행
- execution과 ledger row 하나

### sync 중복 실행

- 같은 connection manual sync 두 번
- 활성 sync job 하나
- derived transaction 중복 없음

## 4. Simulation property

- 같은 input, seed, assumption, engine version은 같은 결과
- 모든 point에서 `p10 <= p50 <= p90`
- 월 납입액 증가 시 같은 seed의 final p50이 감소하지 않음
- 목표금액 증가 시 goal probability가 증가하지 않음
- allocation 합이 1이 아니면 거절
- duration 0, 음수, 600 초과 거절
- NaN, Infinity, decimal overflow 없음
- 정한 성능 budget 안에 완료

초기 성능 budget은 1,000 paths × 600 months를 로컬 CI 기준 2초 이내로 제안하며 첫 benchmark 후 조정한다.

## 5. Milestone 품질 게이트

### Milestone 0

- Markdown link check
- secret scan
- 빈 backend/mobile build

### Milestone 1

- backend formatting/unit/build
- dependency-cruiser와 ESLint architecture test
- mobile lint/typecheck/component smoke
- mobile import boundary와 cycle 검사
- Compose health smoke
- OpenAPI generation
- chart Development Build smoke

### Milestone 2

- security token matrix
- refresh orchestration test
- logout cache/token clear test
- 실제 기기 또는 명시적 미검증 기록

### Milestone 3

- Drizzle migration/Testcontainers
- actual simulator integration
- raw/derived dedup
- Dashboard component states

### Milestone 4

- simulation unit/property/performance
- API integration
- mobile chart component

### Milestone 5

- idempotency concurrency
- cash oversubscription
- timeout/reconciliation
- duplicate settlement
- mobile no-auto-retry 확인

### Milestone 6

- KMS integration 또는 승인된 검증 환경
- production dev endpoint 404
- remote smoke
- migration rehearsal
- rollback rehearsal
- iOS/Android preview build 결과

## 6. 통합 명령 계약

Makefile은 최종적으로 다음 명령을 제공한다.

```text
make bootstrap
make format
make lint
make typecheck
make unit-test
make integration-test
make concurrency-test
make mobile-test
make backend-test
make infra-up
make infra-down
make seed
make reset-demo
make smoke-test
make verify
```

`make verify`는 현재 milestone의 모든 자동 품질 게이트를 실행한다. 명령 구현 전까지 `IMPLEMENTATION_STATUS.md`에서 미완료로 유지한다.

## 7. 수동 검증 기록

각 수동 검증에는 다음을 남긴다.

- 날짜와 commit SHA
- device/model과 OS version
- app build profile/version
- 수행 단계
- 실제 결과
- screenshot/video 위치
- 미검증 분기

수동 검증 대상:

- iOS Face ID/Touch ID
- Android biometric strong/weak 정책
- OIDC browser redirect
- background timeout 후 app lock
- iOS/Android release chart와 gesture
- EAS Preview 설치
