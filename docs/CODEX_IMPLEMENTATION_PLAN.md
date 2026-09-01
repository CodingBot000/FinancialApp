# Financial App Codex 구현 계획

- 상태: 실행 기준선
- 작성일: 2026-09-01
- 대상: 이 저장소에서 구현을 수행하는 Codex와 개발자
- 원본 요구사항: `Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`

## 1. 문서의 역할과 우선순위

이 문서는 원본 상세 명세를 실제 개발 순서로 축소한 실행 계획이다. 원본 명세는 최종 포트폴리오 목표와 배경 설명으로 유지한다.

문서가 충돌할 경우 다음 순서로 판단한다.

1. `MVP_SCOPE.md`
2. `IMPLEMENTATION_DECISIONS.md`와 `docs/adr/*`
3. `API_CONTRACTS.md`, `DATA_MODEL.md`, `SECURITY_MODEL.md`, `TEST_STRATEGY.md`
4. 본 문서
5. `Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`

원본 명세의 `MUST`가 `MVP_SCOPE.md`에서 후속 단계로 이동되었다면 MVP 완료 조건에는 포함하지 않는다. 최종 포트폴리오 완료 단계에서 다시 평가한다.

## 2. 최우선 목표

첫 번째 목표는 로컬 환경에서 다음 단일 흐름을 실제로 완성하는 것이다.

```text
모바일 OIDC 로그인
  → 플랫폼 API 인증
  → 가상 기관 HTTP 동기화
  → raw/derived PostgreSQL 저장
  → 자산 Dashboard 조회
  → 서버 시뮬레이션
  → BUY 주문 및 현금 예약
  → 가상 증권사 HTTP 요청
  → 체결 또는 UNKNOWN
  → reconciliation
  → 모바일 데이터 갱신
```

기능 수보다 이 흐름의 데이터 정합성, 재현성, 실패 복구와 테스트를 우선한다.

## 3. 저장소 구조

`front/`, `backend/` 같은 일반 이름은 사용하지 않는다. 플랫폼과 외부기관 시뮬레이터의 신뢰 경계를 디렉터리 이름으로 드러낸다.

```text
FinancialApp/
├── apps/
│   └── mobile/
├── services/
│   ├── platform-api/
│   └── institution-simulator/
├── infra/
│   ├── database/
│   ├── docker/
│   ├── keycloak/
│   ├── nginx/
│   └── scripts/
├── docs/
│   ├── adr/
│   ├── API_CONTRACTS.md
│   ├── CODEX_IMPLEMENTATION_PLAN.md
│   ├── DATA_MODEL.md
│   ├── DEVELOPMENT_LOG.md
│   ├── ENVIRONMENT_MATRIX.md
│   ├── IMPLEMENTATION_DECISIONS.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── ISSUE_REGISTER.md
│   ├── MVP_SCOPE.md
│   ├── SECURITY_MODEL.md
│   └── TEST_STRATEGY.md
├── .github/workflows/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Makefile
└── README.md
```

백엔드는 하나의 Gradle multi-project build로 관리하되 두 서비스는 별도 실행 파일, 별도 컨테이너, 별도 DB 사용자로 배포한다. 도메인 entity나 repository를 두 서비스가 공유하지 않는다.

## 4. 기술 기준선

### 모바일

- Expo SDK 57 stable
- React Native 0.86
- React 19.2.3
- TypeScript strict mode
- Expo Router
- TanStack Query
- Zustand
- Expo AuthSession
- Expo SecureStore
- Expo LocalAuthentication
- React Native Reanimated 4.x
- Victory Native와 React Native Skia
- npm과 lockfile

Expo 및 native package는 임의 버전을 직접 설치하지 않고 `npx expo install`로 SDK 호환 버전을 선택한다. 차트 라이브러리는 Milestone 1에서 iOS와 Android Development Build smoke test를 통과한 조합만 고정한다.

### 백엔드

- Java 21
- Spring Boot 3.5.16
- Gradle 8 계열 wrapper와 Kotlin DSL
- Spring Security OAuth2 Resource Server
- Spring Data JPA
- Flyway
- PostgreSQL
- WebClient
- Resilience4j
- Testcontainers
- springdoc-openapi

Spring Boot 4는 최종 버전 업그레이드 후보로만 둔다. 초기 구현에서는 주변 라이브러리 호환성과 완성 가능성을 우선한다.

### 인증과 인프라

- Keycloak 26.7.3
- Docker Compose
- 로컬 PostgreSQL 17 major
- AWS Lightsail와 KMS는 로컬 MVP 완료 후 연결

이미지와 패키지는 scaffold 시점에 정확한 patch 또는 digest로 고정하고 `IMPLEMENTATION_DECISIONS.md`에 기록한다.

## 5. Codex 작업 규칙

### 5.1 지속 실행 원칙

Codex는 사용자가 승인한 현재 MVP 범위 안에서 안전하게 진행할 수 있는 작업이 남아 있는 동안 계획이나 중간 보고만 남기고 멈추지 않는다.

- 현재 작업이 완료되면 `IMPLEMENTATION_STATUS.md`의 다음 미완료 항목으로 즉시 이동한다.
- 문서와 저장소에서 답을 확인할 수 있는 일반적인 구현 선택은 사용자 응답을 기다리지 않고 기존 결정에 맞춰 수행한다.
- 하나의 작업이 외부 조건으로 막혀도 독립적으로 진행 가능한 다른 작업이 있으면 해당 작업으로 전환한다.
- test failure, build failure와 환경 오류는 누락 사유가 아니라 조사해야 할 작업으로 취급한다.
- 실패를 숨기거나 검증을 생략해서 다음 milestone으로 넘어가지 않는다.
- milestone 완료 조건을 만족할 때까지 구현, 검증, 수정, 문서 갱신을 반복한다.

다음 경우에만 진행을 멈추고 사용자 입력이나 외부 상태를 기다릴 수 있다.

- credential, 실제 기기, AWS/Lightsail 정보처럼 저장소에서 확인할 수 없는 외부 조건이 필수인 경우
- 원격 migration, 유료 resource 생성, 외부 배포, 데이터 삭제처럼 새 권한이 필요한 경우
- 선택에 따라 제품 범위나 보안 경계가 크게 달라지고 기존 문서로 결정할 수 없는 경우
- 사용자 변경사항과 직접 충돌하여 보존하면서 진행할 안전한 방법이 없는 경우

멈춤이 불가피하면 종료 전에 반드시 다음을 수행한다.

1. `ISSUE_REGISTER.md`에 `BLOCKED` issue를 등록한다.
2. `IMPLEMENTATION_STATUS.md`에 막힌 항목, 영향과 재개 조건을 기록한다.
3. `DEVELOPMENT_LOG.md`에 시도한 내용과 검증 결과를 추가한다.
4. 독립적으로 진행 가능한 작업이 정말 없는지 확인한다.
5. 검증을 통과한 변경만 commit하고, 불완전하거나 검증하지 못한 코드는 완료로 표시하지 않는다.

### 5.2 작업 시작과 종료

각 작업 시작 전 다음을 수행한다.

1. `git status --short --branch`로 사용자 변경사항을 확인한다.
2. `IMPLEMENTATION_STATUS.md`에서 현재 milestone과 다음 항목을 확인한다.
3. `ISSUE_REGISTER.md`에서 현재 milestone의 open/blocking issue를 확인한다.
4. `DEVELOPMENT_LOG.md`의 다음 `DEV-####` ID를 할당한다.
5. 관련 계약 문서와 ADR을 읽는다.
6. 변경 범위를 한 milestone의 한 vertical slice로 제한한다.
7. 구현과 테스트를 같은 변경 단위에 포함한다.

각 작업 종료 전 다음을 수행한다.

1. 관련 formatter, lint, typecheck, unit/integration test를 실행한다.
2. 실패한 검증을 성공으로 기록하지 않는다.
3. `IMPLEMENTATION_STATUS.md`를 실제 상태로 갱신한다.
4. 완료, 실패, 미검증, 후속 작업을 `DEVELOPMENT_LOG.md`에 기록한다.
5. 새 이슈·누락·불가피한 연기를 `ISSUE_REGISTER.md`에 등록하거나 기존 항목을 갱신한다.
6. 계약 또는 아키텍처 결정이 변경되면 코드보다 문서를 먼저 또는 같은 변경에서 갱신한다.
7. 실제 비밀정보와 합성 데이터가 아닌 개인정보가 Git에 없는지 확인한다.
8. 검증을 통과한 변경과 관련 문서 갱신을 하나의 atomic commit으로 만든다.
9. commit 후 `git status`와 `git log -1 --oneline`으로 결과를 확인한 뒤 다음 작업으로 이동한다.

### 5.3 단계별 Commit 규칙

각 vertical slice와 milestone 완료는 commit으로 남긴다. 여러 milestone의 구현을 하나의 commit으로 합치지 않는다.

모든 개발 commit은 다음 형식을 사용한다.

```text
<type>(m<milestone>): <summary> [DEV-####]
```

예:

```text
docs(m0): establish implementation tracking [DEV-0001]
chore(m1): scaffold backend services [DEV-0002]
feat(m3): ingest synthetic account data [DEV-0012]
fix(m5): prevent duplicate order settlement [DEV-0028]
```

허용 type은 `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`다.

commit 전 필수 확인:

1. 변경한 기능의 자동 검증이 통과했다.
2. `git diff --check`가 통과했다.
3. 의도한 파일만 stage되었다.
4. secret과 실제 개인정보 패턴이 없다.
5. 같은 `DEV-####` 항목이 `DEVELOPMENT_LOG.md`에 있다.
6. 완료 checklist와 현재 next action이 `IMPLEMENTATION_STATUS.md`에 반영되었다.
7. 관련 `ISSUE-####` 또는 `GAP-####`가 최신 상태다.

commit 정책:

- build나 test가 깨진 상태를 정상 단계 commit으로 남기지 않는다.
- 외부 blocker가 생기면 독립적으로 검증된 변경과 문서만 commit한다.
- 미완성 구현을 숨기기 위한 `skip`, test disable, 임시 성공 응답을 commit하지 않는다.
- 이전 commit을 amend/rebase/reset하여 추적 기록을 지우지 않는다. 사용자가 명시적으로 요청한 경우만 예외다.
- 변경이 없으면 빈 commit을 만들지 않는다.
- milestone의 마지막 commit은 상태표와 인수 조건을 함께 갱신해야 한다.

### 5.4 완료·이슈·누락 기록 규칙

세 문서의 역할을 분리한다.

- `IMPLEMENTATION_STATUS.md`: 현재 milestone, 완료 checklist, active blocker와 바로 다음 작업
- `DEVELOPMENT_LOG.md`: commit 단위의 append-only 작업 이력
- `ISSUE_REGISTER.md`: 미해결 issue, blocker, deferred item과 불가피한 누락의 수명주기

모든 commit은 `DEVELOPMENT_LOG.md`에 같은 `DEV-####` ID로 기록한다. 기록에는 완료 내용, 변경 파일, 검증 명령과 결과, 발생한 issue/gap, 다음 작업을 포함한다.

이슈와 누락은 다음 ID를 사용한다.

- `ISSUE-####`: defect, 환경 문제, blocker, 보안·성능 위험
- `GAP-####`: 요구사항 누락, 의도적 연기, 검증하지 못한 인수 조건

규칙:

- issue와 gap 항목은 삭제하지 않는다. 해결 시 `RESOLVED`로 바꾸고 해결 `DEV-####`와 검증 결과를 기록한다.
- checklist 항목을 완료하지 못하면 제거하거나 완료 표시하지 않고 해당 `ISSUE-####` 또는 `GAP-####`를 옆에 연결한다.
- MVP 완료 조건에 영향을 주는 open blocker/gap이 있으면 milestone을 `DONE`으로 표시하지 않는다.
- 후속 milestone으로 연기할 때는 이유, 영향, 목표 milestone, 재확인 조건을 기록한다.
- 자동화하지 못한 수동 검증은 `UNVERIFIED` gap으로 남기고 기기·권한이 생기면 재검증한다.
- 오래된 이슈도 추적 가능하도록 최초 발견일, 마지막 갱신일과 관련 `DEV-####`를 유지한다.

금지 사항:

- 원격 DB에 사용자 확인 없이 migration 또는 seed 실행
- 실제 계좌정보, 개인정보, 금융기관 credential 사용
- 주문 POST 자동 retry
- 외부 HTTP 요청을 포함하는 장시간 DB transaction
- JPA entity를 API response로 직접 반환
- access token 또는 refresh token 로그 출력
- 서버 데이터를 Zustand에 복제
- 테스트를 비활성화하여 품질 게이트 통과
- `Flyway clean`, 기존 schema 삭제, destructive migration

## 6. 구현 Milestone

### Milestone 0 — 저장소와 결정 기준선

작업:

- 본 문서 세트 확정
- Java 21, Node, Docker 실행 환경 확인
- 디렉터리 scaffold
- Gradle wrapper와 Expo package manager 결정 적용
- `.env.example`, Makefile 기본 명령 작성

완료 조건:

- 모든 핵심 결정이 `IMPLEMENTATION_DECISIONS.md`에 있음
- Java 21 사용 가능
- 빈 프로젝트 구조가 문서와 일치
- secret이 커밋되지 않음

### Milestone 1 — 실행 가능한 골격

작업:

- PostgreSQL, Keycloak Docker Compose
- platform-api와 simulator Spring Boot scaffold
- mobile Expo scaffold와 Development Build 설정
- 각 서비스 health endpoint
- correlation/request ID
- 기본 CI
- Victory Native/Reanimated/Skia compatibility spike

완료 조건:

- fresh clone 기준 `make bootstrap`과 `make infra-up` 실행 가능
- 두 백엔드 서비스가 서로 다른 process로 기동
- 모바일이 platform health를 조회
- iOS와 Android 중 최소 한 플랫폼 Development Build에서 차트 smoke test 성공
- CI에서 formatting, typecheck, unit test, build 성공

### Milestone 2 — OIDC와 모바일 App Lock

작업:

- Keycloak realm import
- public mobile client, Authorization Code + PKCE S256
- API issuer, audience, scope 검증
- `/api/v1/me`
- access token 메모리 보관
- refresh token SecureStore 보관
- 401 refresh single-flight
- LocalAuthentication app lock
- 로그아웃과 cache clear

완료 조건:

- 로그인 후 `/me` 성공
- 잘못된 issuer, audience, scope 거절
- refresh 성공과 실패 흐름 테스트
- 실제 기기 생체인증 수동 확인 또는 외부 조건으로 명확히 기록
- token이 로그와 AsyncStorage에 없음

### Milestone 3 — 단일 기관 동기화와 Dashboard

작업:

- deterministic `BALANCED_WORKER` seed
- simulator 계좌, 보유자산, 거래내역 API
- MyData connection과 manual sync
- immutable raw payload와 별도 processing result
- normalization과 deduplication
- 자산 summary, accounts, holdings, history API
- 모바일 Dashboard와 계좌 목록

완료 조건:

- platform이 simulator를 HTTP로만 호출
- 같은 payload 재동기화 시 거래 중복 없음
- raw에서 derived 레코드까지 추적 가능
- Dashboard가 PostgreSQL 데이터 표시
- loading, empty, error, retry 상태 존재

### Milestone 4 — 서버 시뮬레이션

작업:

- versioned synthetic assumption set
- seeded monthly Monte Carlo engine
- p10, p50, p90과 목표 달성 확률
- 결과 저장과 조회
- 모바일 입력, 결과 차트, disclaimer

완료 조건:

- 같은 입력, seed, engine version 결과 동일
- `p10 <= p50 <= p90`
- 입력 경계와 overflow/NaN 테스트 통과
- 모바일 차트가 서버 결과만 사용

### Milestone 5 — BUY 주문과 복구

작업:

- quote preview
- BUY market order
- idempotency key와 request hash
- row lock 기반 현금 예약
- simulator 주문 접수와 clientOrderId 중복 방지
- FILLED, REJECTED, UNKNOWN 상태
- reconciliation worker
- cash ledger, position, execution, audit
- 모바일 주문 전 local biometric gate와 상태 조회

완료 조건:

- 동일 key 동일 payload는 같은 주문 반환
- 동일 key 다른 payload는 conflict
- 현금 100만 원에서 80만 원 동시 주문 두 개 중 하나만 예약
- timeout 후 POST 재전송 없이 status query로 복구
- settlement가 중복 실행되지 않음
- 체결 후 모바일 Query invalidation으로 데이터 갱신

Milestone 5까지가 로컬 MVP 완료다.

### Milestone 6 — 포트폴리오 하드닝과 원격 데모

작업:

- DB outbox
- scheduled sync
- 감사·보안 로그 완성
- local/AWS KMS envelope encryption
- demo/staging 장애 패널
- Lightsail DB 격리와 TLS
- HTTPS, Nginx, 배포와 rollback
- EAS Preview Build
- README, diagram, 3분 데모

완료 조건:

- 원격 E2E와 UNKNOWN reconciliation 데모 성공
- production profile에 dev endpoint가 없음
- demo profile dev endpoint는 `scenario.admin`으로 보호
- 민감 필드 plaintext 검색 실패
- smoke test와 rollback 절차 검증

## 7. 범위 변경 규칙

새 기능은 다음 조건을 모두 만족할 때만 추가한다.

- 현재 milestone 완료 조건을 지연시키지 않음
- `MVP_SCOPE.md`에 포함되거나 사용자가 명시적으로 승인함
- 데이터 모델과 API 계약이 먼저 정의됨
- 테스트 방법이 정의됨

SELL, 다기관 부분 실패, push, SSE/WebSocket, 관리자 웹, 앱스토어 정식 출시는 Milestone 6 완료 전 시작하지 않는다.

## 8. 보고 형식

각 milestone 완료 보고는 다음 형식을 사용한다.

```markdown
## Milestone N 결과

### 완료
- ...

### 변경 파일
- ...

### Commit
- DEV ID:
- commit:

### 검증
- 명령: ...
- 결과: ...

### 수동/외부 검증
- ...

### 남은 위험
- ...

### 이슈와 누락
- ISSUE/GAP:
- 상태와 재확인 조건:

### 문서 갱신
- status/log/register/contract:

### 다음 진입 조건
- [ ] ...
```
