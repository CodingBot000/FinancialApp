# 개발 로그

- 기록 방식: append-only
- 마지막 DEV ID: `DEV-0011`
- 다음 영역 ID: `DEV-0012`

모든 integration/shared commit은 하나의 `DEV-####`와 연결한다. frontend와 backend 영역 commit은 각각 `FE-####`, `BE-####`와 workstream 개발 로그를 사용한다. DEV-0006 이후에는 단일 main에서 작업하되 영역별 ID namespace와 기록은 유지한다. commit subject에도 같은 ID를 넣어 Git history와 문서 기록을 상호 추적할 수 있게 한다.

기존 항목의 사실 오류를 수정할 때는 원문을 삭제하지 않고 `정정` 또는 `추가 기록`을 남긴다.

## DEV-0001 — 실행 문서와 지속 개발 통제 기준선

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `docs(m0): establish implementation tracking [DEV-0001]`

### 완료

- 원본 상세 명세를 실행 가능한 MVP와 milestone으로 축소
- API, 데이터, 보안, 테스트와 환경 계약 작성
- 시스템 경계, IdP, DB 격리, background job ADR 작성
- 지속 실행과 blocker 전환 규칙 추가
- vertical slice와 milestone 단위 atomic commit 규칙 추가
- 완료·이슈·누락의 상시 문서화 절차 추가
- `DEVELOPMENT_LOG.md`와 `ISSUE_REGISTER.md` 생성

### 변경 파일

- `docs/README.md`
- `docs/MVP_SCOPE.md`
- `docs/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/ISSUE_REGISTER.md`
- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY_MODEL.md`
- `docs/TEST_STRATEGY.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/adr/ADR-0001-system-boundaries.md`
- `docs/adr/ADR-0002-identity-provider.md`
- `docs/adr/ADR-0003-database-isolation.md`
- `docs/adr/ADR-0004-background-jobs.md`

### 검증

- 필수 문서 존재 확인: 통과
- Markdown code fence 균형 검사: 통과
- trailing whitespace 검사: 통과
- 기본 secret/private-key 패턴 검사: 통과
- 축소 명세의 SELL/PARTIAL/order 상태 충돌 검사: 통과

### 이슈와 누락

- `ISSUE-0001`: 당시 Java 21 환경 준비 필요로 기록했으나 backend 기술 기준이 잘못되었으며 `DEV-0003`에서 Node.js 기준으로 정정·해소됨
- 등록된 `GAP` 없음

### 다음 작업

- `DEV-0002`: Java 21 사용 가능 여부 해결 및 저장소 scaffold 시작

## DEV-0002 — 공용 DB용 prefix와 물리 테이블 정의

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `docs(m0): define prefixed database tables [DEV-0002]`

### 완료

- 사용자 우선순위에 따라 runtime scaffold 전에 DB naming 기준을 먼저 확정
- 모든 애플리케이션 소유 DB 객체에 `finapp_` prefix 강제
- platform/simulator migration history table 이름 분리
- Keycloak vendor table의 별도 database/schema 격리 정책 확정
- schema, table, column, PK/FK/index/check constraint를 포함한 물리 테이블 정의서 작성
- 데이터 모델, ADR, 환경 확인표와 구현 결정 동기화

### 변경 파일

- `docs/TABLE_DEFINITIONS.md`
- `docs/Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`
- `docs/DATA_MODEL.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/README.md`
- `docs/adr/ADR-0003-database-isolation.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/ISSUE_REGISTER.md`

### 검증

- 모든 application-owned table 이름의 `finapp_` prefix 검사
- schema/table 이름과 logical data model 대응 검사
- Markdown code fence, trailing whitespace, staged diff 검사

### 이슈와 누락

- `ISSUE-0001`: 당시 Java 21 준비를 `DEV-0003`으로 이동했으나 backend 기술 기준 정정으로 `DEV-0003`에서 해소
- Keycloak vendor table은 직접 prefix 변경 불가. 별도 `finapp_keycloak` database 우선, 불가 시 전용 schema로 격리

### 다음 작업

- `DEV-0003`: 앱·서버 architecture baseline과 자동 검증 기준 작성

## DEV-0003 — 앱·서버 권장 아키텍처와 품질 기준선

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `docs(m0): establish Node architecture guide [DEV-0003]`

### 완료

- 신뢰 경계 기반 시스템 구조와 모듈형 모놀리스 채택 근거 문서화
- 사용자가 backend를 Node.js + TypeScript, NestJS/Fastify, PostgreSQL, Vitest/Jest, OAuth2/OIDC와 Lightsail로 정정한 내용을 전체 기준 문서에 반영
- Node.js 24 LTS, NestJS 12 + Fastify adapter와 npm workspaces 기준 확정
- platform-api의 NestJS feature module과 실용적 ports/adapters 의존 방향 확정
- dependency-cruiser, ESLint, TypeScript strict와 Vitest 자동 검증 기준 추가
- Drizzle ORM/Kit과 `finapp_` migration history table 기준 확정
- `jose` 기반 remote JWKS/JWT 검증 adapter 기준 확정
- simulator의 독립 코드·계약·DB 소유권 규칙 강화
- Expo Router route adapter와 feature-first mobile 구조 확정
- TanStack Query, Zustand, memory와 SecureStore 간 상태 소유권 분리
- 처음 고정할 경계와 추후 점진적으로 개선할 내부 구현을 구분한 refactor 정책 추가
- architecture violation을 CI gate와 issue/gap으로 추적하도록 기존 실행 문서와 테스트 전략 동기화

### 변경 파일

- `docs/ARCHITECTURE_GUIDE.md`
- `docs/MVP_SCOPE.md`
- `docs/README.md`
- `docs/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/TABLE_DEFINITIONS.md`
- `docs/SECURITY_MODEL.md`
- `docs/TEST_STRATEGY.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/ISSUE_REGISTER.md`
- `docs/adr/ADR-0001-system-boundaries.md`
- `docs/adr/ADR-0002-identity-provider.md`
- `docs/adr/ADR-0003-database-isolation.md`
- `docs/adr/ADR-0004-background-jobs.md`
- `docs/Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`

### 검증

- 공식 Node.js LTS, NestJS module/Fastify/testing, Drizzle, Testcontainers와 dependency-cruiser 문서 대조
- npm registry에서 NestJS `12.0.1`, 공식 adapter 내 Fastify `5.12.1`, Vitest `4.1.11` 호환 기준 확인
- 공식 Expo Router, Expo TypeScript와 TanStack Query 문서 대조
- Markdown link target·code fence·trailing whitespace·문서 상호 참조 검사
- `git diff --check`와 staged file 범위 확인

### 이슈와 누락

- `ISSUE-0001`: 잘못된 Java/Spring backend 전제로 발생했으며 Node.js 기준 정정 후 RESOLVED
- 등록된 architecture `GAP` 없음

### 다음 작업

- `DEV-0004`: Node.js/NestJS architecture baseline에 맞춘 npm workspace와 저장소 scaffold 시작

## DEV-0004 — Frontend·Backend 병렬 개발 운영 기준선

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `docs(m0): define parallel development lanes [DEV-0004]`

### 완료

- 사용자의 우선순위에 따라 scaffold 전에 두 Codex session 병렬 개발 지침을 먼저 확정
- 같은 working directory/branch 동시 사용을 금지하고 frontend/backend별 worktree와 branch 분리
- frontend, backend와 integration owner의 파일 소유권 및 shared file 직렬 통합 규칙 확정
- `FE-####`, `BE-####`, `DEV-####` commit namespace와 session별 append-only log 분리
- session별 issue/gap namespace와 cross-session handoff protocol 추가
- backend canonical OpenAPI revision과 frontend contract mock 동기화 규칙 확정
- root lockfile conflict 시 package manifest 통합 후 package manager 재생성 규칙 추가
- frontend 원격 DB 직접 접근 금지와 backend 단일 migration owner 원칙 추가
- 합성 데이터여도 shared Lightsail DB의 destructive reset·동시 migration이 안전하지 않음을 환경·테스트 지침에 반영
- 공통 scaffold를 먼저 직렬 commit한 뒤 두 session을 시작하도록 다음 작업 순서 변경

### 변경 파일

- `docs/PARALLEL_DEVELOPMENT_GUIDE.md`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`
- `docs/workstreams/backend/DEVELOPMENT_LOG.md`
- `docs/workstreams/backend/ISSUE_REGISTER.md`
- `docs/README.md`
- `docs/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/ARCHITECTURE_GUIDE.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ISSUE_REGISTER.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/TEST_STRATEGY.md`
- `docs/Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`
- `docs/DEVELOPMENT_LOG.md`

### 검증

- Markdown local link target와 code fence 균형 검사
- trailing whitespace와 `git diff --check`
- 중앙/lane commit ID, 문서 소유권과 remote DB 규칙 상호 참조 검사
- table catalog의 `finapp_` prefix 회귀 검사
- secret/private-key pattern과 staged file 범위 검사

### 이슈와 누락

- active issue/gap 없음
- 실제 frontend/backend session과 worktree는 공통 scaffold `DEV-0005` 완료 후 생성
- 원격 DB 정보와 migration 승인은 아직 제공되지 않았으며 local/contract mock 병렬 개발을 막지 않음

### 다음 작업

- `DEV-0005`: root npm workspace, 디렉터리, 공통 lockfile, OpenAPI/CI baseline을 통합 scaffold
- 이후 frontend `FE-0001`과 backend `BE-0001` 병렬 시작

## DEV-0005 — 병렬 분리용 공통 Workspace Scaffold

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `chore(m0): scaffold parallel workspace baseline [DEV-0005]`

### 완료

- Node.js 24.19.0/npm 11.17.0 기반 root npm workspaces와 단일 lockfile 생성
- TypeScript 6.0.3 strict/NodeNext, ESLint 10, Prettier 3와 Vitest 4 공통 baseline 추가
- TypeScript 7과 typescript-eslint peer 범위 충돌을 확인하고 호환되는 TypeScript 6.0.3 선택 근거 기록
- Expo SDK 57.0.18, React 19.2.3, React Native 0.86.3과 Expo Router mobile scaffold 생성
- 공식 Expo template의 Reanimated/Worklets/native dependency를 root override로 단일화하고 Expo Doctor 21/21 통과
- frontend가 backend 없이 사용할 `PlatformApi` port, deterministic mock adapter와 schema-validated fixture 추가
- NestJS 12.0.1 + Fastify 기반 platform-api와 institution-simulator feature module/health endpoint 생성
- 실제 Fastify adapter를 사용하는 두 backend E2E test 추가
- platform/mobile과 platform/simulator용 canonical OpenAPI 3.1 계약 추가
- Redocly lint와 AJV fixture validation을 root/CI quality gate에 연결
- frontend/backend/contracts/integration GitHub Actions job baseline 추가
- `.nvmrc`, engines, `.env.example`, Makefile, root README와 infra ownership 문서 추가
- 빌드된 두 backend process와 Expo web 첫 화면을 실제 실행해 smoke 검증

### 변경 파일

- root: `.env.example`, `.gitignore`, `.npmrc`, `.nvmrc`, `.prettierignore`, `.prettierrc.json`, `Makefile`, `README.md`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.base.json`
- CI/script: `.github/workflows/ci.yml`, `scripts/check-secrets.mjs`, `scripts/validate-contract-fixtures.mjs`
- mobile: `apps/mobile/**`
- backend: `services/platform-api/**`, `services/institution-simulator/**`
- contracts/infra: `contracts/openapi/**`, `infra/README.md`
- docs: `DEVELOPMENT_LOG.md`, `IMPLEMENTATION_DECISIONS.md`, `IMPLEMENTATION_STATUS.md`, `ISSUE_REGISTER.md`, `PARALLEL_DEVELOPMENT_GUIDE.md`, `workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- `npm install`: workspace install과 lockfile 생성 성공
- `npm run verify`: formatting, OpenAPI/fixture, Expo dependency, secret scan, lint, 세 workspace typecheck/test와 두 backend build 통과
- Vitest: mobile 2, platform-api 1, institution-simulator 1 test 통과
- `npm exec --yes expo-doctor@latest`: 21/21 checks 통과
- runtime smoke: `GET :18081/api/v1/health`, `GET :18082/sim/v1/health`가 canonical JSON 응답 반환
- rendered smoke: Expo web title/DOM/화면 확인, reload 후 화면 유지, browser console warning/error 0건
- `npm audit --json`: moderate 13, high 0, critical 0; 비호환 downgrade 자동 fix는 적용하지 않음
- Markdown/link/code fence, table prefix, secret pattern과 staged file 범위 검사

### 이슈와 누락

- `ISSUE-0002`/`FE-ISSUE-0001`: Expo 57 transitive moderate advisory. local 병렬 개발은 가능하며 frontend lane과 release gate에서 추적
- Docker Compose, Drizzle와 architecture dependency gate는 backend `BE-0001`에서 구현
- native iOS/Android Development Build는 frontend lane의 Milestone 1 검증으로 남김
- 원격 Lightsail DB 정보와 migration 승인은 미제공이며 병렬 local 개발을 막지 않음

### 다음 작업

- 이 commit을 공통 base로 frontend와 backend worktree 생성
- frontend `FE-0001`과 backend `BE-0001`을 별도 Codex session에서 병렬 시작
- integration owner는 양쪽 첫 vertical slice 후 `DEV-0006` main 통합 수행

## DEV-0006 — Frontend/Backend 단일 Main 통합

- 날짜: 2026-09-02
- Milestone: 1 완료, 2~5 통합 기준선
- 상태: COMPLETED
- 예정 commit: `chore(integration): unify parallel workstreams [DEV-0006]`

### 완료

- `codex/backend` BE-0001~BE-0008 head `0753110`을 `origin/codex/backend`에 push하고 merge commit `b927e3a`로 main에 통합
- `codex/frontend` FE-0001~FE-0009 head `dfc3547`을 `origin/codex/frontend`에 push하고 merge commit `2926278`로 main에 통합
- frontend/backend가 추가한 전체 manifest를 기준으로 root `package-lock.json` 재생성
- npm install script를 exact version allow와 명시적 deny policy로 고정하고 pending package 0건 확인
- mobile API/OIDC local 환경변수 이름을 실제 source와 일치시키고 Keycloak redirect를 `wealthsandbox://oauth/callback`으로 통일
- mobile architecture boundary와 두 backend dependency-cruiser를 root `verify`와 CI 필수 gate에 연결
- `.dockerignore`로 Docker context를 2.1GB local tree에서 190KB source context로 제한
- backend Docker build를 service workspace + root build tool clean install로 제한하고 runtime image에서 devDependency 제거 유지
- 중앙 상태, 결정, issue/gap와 병렬 단계 종료 문서를 현재 구현 상태로 갱신

### 변경 파일

- root/CI: `.dockerignore`, `.env.example`, `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `README.md`
- mobile config: `apps/mobile/.env.example`
- infra: `infra/keycloak/finapp-realm.json`, `infra/docker/platform-api.Dockerfile`, `infra/docker/institution-simulator.Dockerfile`
- docs: `DEVELOPMENT_LOG.md`, `IMPLEMENTATION_DECISIONS.md`, `IMPLEMENTATION_STATUS.md`, `ISSUE_REGISTER.md`, `PARALLEL_DEVELOPMENT_GUIDE.md`

### 검증

- `npm ci`: 통합 lockfile clean install 성공, install script pending 0
- `npm run verify` + Colima Testcontainers socket override: formatting, OpenAPI/fixture, Expo dependency, secret, 세 architecture gate, lint, strict typecheck, 113 tests와 두 Nest build 통과
- `npm exec --yes expo-doctor@latest`: 21/21 checks 통과
- architecture: mobile 65 modules, platform 67 modules/169 dependencies, simulator 26 modules/38 dependencies 위반 0
- Vitest: mobile 21 files/60 tests, simulator 3 files/7 tests, platform 8 files/46 tests 통과
- clean PostgreSQL 17.6 Compose: platform migration history 6, simulator history 2
- DB catalog: `finapp_` relation/constraint prefix 위반 0, platform↔simulator schema privilege 모두 false
- simulator seed 2회 실행 후 synthetic customer 1행 유지
- runtime: platform/simulator health, Keycloak discovery와 imported mobile client redirect 확인
- auth smoke: 무인증 `/api/v1/me`가 trace header와 canonical 401 ProblemDetails 반환
- Docker: build context 190KB, 두 production image build 성공, runtime workspace audit 각각 vulnerability 0
- `npm audit --json`: moderate 18, high 0, critical 0; Expo 관련 14와 Drizzle build-time 관련 4로 중앙 issue 분리
- 검증용 Compose container/network/volume은 완료 후 제거

### 이슈와 누락

- `ISSUE-0002`: 통합 Expo dependency moderate advisory 14건 OPEN
- `ISSUE-0003`: Drizzle Kit build-time dependency moderate advisory 4건 OPEN; backend runtime 영향 없음
- `GAP-0001`: live OIDC login/refresh/`/me`와 native restart는 FE-0010에서 검증
- `GAP-0002`: 현재 Xcode 제약으로 iOS Development Build runtime 미검증
- `GAP-0003`: 실제 biometric 기기 prompt/background App Lock 미검증
- 첫 Testcontainers 실행의 Colima host socket mount 오류는 `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`로 환경 원인을 확인하고 전체 재검증 통과
- 병렬 Docker build의 메모리 경합은 workspace-scoped install과 직렬 build로 해소했으며 application defect로 남지 않음

### 다음 작업

- `BE-0009`: simulator order submit, settlement와 reconciliation
- `FE-0010`: 최종 backend OpenAPI 기준 OIDC `/me`와 authenticated API 통합
- 이후 Milestone 3 Dashboard, Milestone 4 simulation UI, Milestone 5 order UI를 단일 main에서 직렬 진행

## DEV-0007 — 단일 Main 통합 개발계획 기준선

- 날짜: 2026-09-02
- Milestone: 2~5 통합 계획
- 상태: COMPLETED
- 예정 commit: `docs(integration): establish unified development plan [DEV-0007]`

### 완료

- 공통 base `5ffc23e`, backend BE-0001~BE-0008, frontend FE-0001~FE-0009와 DEV-0006 통합 결과를 최초 계획·MVP·계약·테스트 문서와 대조
- 양쪽 분리 commit의 Git 이력 유실이 없고 local/remote `main` 기준선이 같은 상태임을 확인
- 기존 계획과 병렬 지침은 이력으로 보존하고 `INTEGRATED_DEVELOPMENT_PLAN.md`를 단일 main 활성 실행계획으로 작성
- 완료 기준을 Git 통합, 기능 구현, 계약 일치, local E2E와 외부 수동 검증으로 구분
- 기존 다음 작업을 계약 gate, simulator 경계, platform settlement/reconciliation/audit, mobile M2~M5 vertical slice와 local E2E 순으로 재구성
- frontend/backend workstream 로그의 branch/base 표기를 역사적 분리 상태와 현재 main 작업 상태로 정정
- `GAP-0004`~`GAP-0007`을 등록해 계약 추적, simulator MVP 표면, 최소 audit와 full-stack/fresh-clone 인수를 추적

### 변경 파일

- root 안내: `README.md`
- 활성 계획: `docs/INTEGRATED_DEVELOPMENT_PLAN.md`
- 인덱스/기존 계획: `docs/README.md`, `docs/CODEX_IMPLEMENTATION_PLAN.md`, `docs/PARALLEL_DEVELOPMENT_GUIDE.md`
- 추적: `docs/IMPLEMENTATION_STATUS.md`, `docs/IMPLEMENTATION_DECISIONS.md`, `docs/ISSUE_REGISTER.md`, `docs/DEVELOPMENT_LOG.md`
- 영역 이력: `docs/workstreams/frontend/DEVELOPMENT_LOG.md`, `docs/workstreams/backend/DEVELOPMENT_LOG.md`

### 검증

- Git: `main`과 `origin/main`이 검토 기준 `2574ad0`에서 일치하고 backend/frontend head와 merge commit이 모두 이력에 존재함을 확인
- 구현 대조: platform OpenAPI 15개 path, simulator OpenAPI 4개 path, mobile feature가 health/login/app-lock까지인 상태를 source와 대조
- 계약 gap: root fixture validator가 `HealthResponse` 1건만 검사하고 controller 기반 OpenAPI 생성/전체 route 대조가 없음을 확인
- DB/기능 gap: audit table/module, simulator market/order/scenario와 platform settlement/reconciliation source가 아직 없음을 확인
- 문서: Prettier format check, Markdown 참조 경로 검사와 `git diff --check` 통과
- 보안: root `security:secrets` 통과

### 이슈와 누락

- 기존 `ISSUE-0002`, `ISSUE-0003`, `GAP-0001`~`GAP-0003` 유지
- 신규 `GAP-0004`: controller–OpenAPI–consumer 전체 계약 추적
- 신규 `GAP-0005`: simulator 시세·brokerage·scenario·reset/reseed
- 신규 `GAP-0006`: local MVP 최소 append-only audit event
- 신규 `GAP-0007`: local full-stack E2E와 fresh-clone 인수
- portfolio 추천, outbox, KMS와 원격 배포는 누락이 아니라 `MVP_SCOPE.md`에 따라 Milestone 6으로 유지

### 다음 작업

- `DEV-0010`: canonical OpenAPI 전체 operation의 provider/consumer 계약 추적과 CI gate 구현
- 이후 `BE-0009`, `BE-0010`, `FE-0010`~`FE-0014`, `DEV-0011` 순으로 local MVP 완성

## DEV-0008 — 병렬 개발 Worktree 정리

- 날짜: 2026-09-02
- Milestone: 통합 workspace 정리
- 상태: COMPLETED
- 예정 commit: `chore(integration): remove historical worktrees [DEV-0008]`

### 완료

- `/Users/switch/Development/Web/FinancialApp-frontend`의 `codex/frontend`가 clean이고 `origin/codex/frontend`와 일치함을 확인
- `/Users/switch/Development/Web/FinancialApp-backend`의 `codex/backend`가 clean이고 `origin/codex/backend`와 일치함을 확인
- Git `worktree remove`로 두 보조 directory와 연결 metadata를 제거
- 활성 workspace를 `/Users/switch/Development/Web/FinancialApp`의 `main` 하나로 정리
- local/remote `codex/frontend`, `codex/backend` branch는 복구 가능한 분리 개발 이력으로 보존

### 변경 파일

- workspace: 병렬 보조 worktree directory 2개 제거, branch 삭제 없음
- docs: `INTEGRATED_DEVELOPMENT_PLAN.md`, `README.md`, `PARALLEL_DEVELOPMENT_GUIDE.md`, `IMPLEMENTATION_STATUS.md`, `ISSUE_REGISTER.md`, `DEVELOPMENT_LOG.md`

### 검증

- `git worktree list --porcelain`: `FinancialApp` main worktree 하나만 존재
- 상위 directory 검사: `FinancialApp-frontend`, `FinancialApp-backend`가 존재하지 않음
- branch 검사: local/remote `codex/frontend`와 `codex/backend` 유지
- `main`과 `origin/main` 일치, working tree clean
- 문서 format과 `git diff --check` 통과

### 이슈와 누락

- 신규 issue/gap 없음
- 보조 directory는 제거됐지만 두 remote branch에서 필요 시 새 worktree를 다시 만들 수 있다.

### 다음 작업

- `DEV-0010`: canonical OpenAPI 전체 operation의 provider/consumer 계약 추적과 CI gate

## DEV-0009 — 원격 DB Migration 범위 제외와 STOP Gate

- 날짜: 2026-09-02
- Milestone: 현재 실행 범위 조정
- 상태: COMPLETED
- 예정 commit: `docs(integration): defer remote migration boundary [DEV-0009]`

### 완료

- 사용자의 최신 결정에 따라 원격 DB migration을 이번 연속 개발 실행 범위에서 제외
- 원격 DB endpoint/credential 요청, 사전 설정 검토, 연결, catalog 조회, migration/seed와 원격 배포도 이번 실행에서 시작하지 않도록 범위 확정
- 로컬 MVP와 Milestone 6A local hardening까지는 멈춤 없이 진행하고 단계 10 완료 결과를 commit/push한 뒤 반드시 종료하도록 STOP gate 추가
- 기존 원격 migration 승인 의사는 이번 실행에 재사용하지 않고 향후 사용자가 별도 실행으로 명시적으로 재개하도록 결정 `D-045` 등록
- 원격 미실행을 issue/gap 또는 blocker가 아닌 `CURRENT_RUN_EXCLUDED` 상태로 분리
- 계약 gate와 local E2E의 다음 DEV ID를 각각 `DEV-0010`, `DEV-0011`로 조정

### 변경 파일

- `README.md`
- `docs/INTEGRATED_DEVELOPMENT_PLAN.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/ISSUE_REGISTER.md`
- `docs/DEVELOPMENT_LOG.md`

### 검증

- 활성 계획, 상태, 결정, issue target과 DEV ID의 원격 STOP 경계 일치 확인
- `remote`, `Lightsail`, `migration` 관련 활성 문구가 현재 실행 제외와 향후 별도 재개 조건을 명시하는지 검색 검증
- Prettier format check, secret scan과 `git diff --check` 통과
- 원격 DB 연결·조회·migration 명령은 실행하지 않음

### 이슈와 누락

- 신규 issue/gap 없음
- 원격 DB와 배포는 사용자가 확정한 현재 실행 범위 제외이며 장기 Milestone 6B 요구사항으로 보존

### 다음 작업

- `DEV-0010`: canonical OpenAPI 전체 operation의 provider/consumer 계약 추적과 CI gate
- local 단계 10 완료 후 Milestone 6B 원격 단계 전에 STOP

## DEV-0010 — 전체 Operation 계약 추적과 통합 Gate

- 날짜: 2026-09-02
- Milestone: 2~5 통합 계약
- 상태: COMPLETED
- 예정 commit: `test(integration): enforce full API contract trace [DEV-0010]`

### 완료

- `contracts/operation-coverage.yaml`에 platform 16개와 simulator 4개 operation의 canonical method/path, controller handler, provider test와 consumer adapter/후속 FE 상태를 추적
- controller source의 NestJS route를 정적으로 수집해 canonical OpenAPI와 양방향 대조하고 미등록/미구현 endpoint를 차단
- `contracts/fixtures/operation-responses.json`에 모든 현재 operation의 성공 consumer fixture와 주요 platform/simulator ProblemDetails fixture 추가
- 모든 documented response status가 JSON schema를 갖는지 확인하고 기존 schema가 없던 두 contract의 429 response를 canonical ProblemDetails로 보강
- 실제 NestJS/Fastify provider E2E에서 platform 16개와 simulator 4개 성공 응답을 response schema에 검증하고 platform 400/401/403 ProblemDetails도 검증
- `contracts/openapi/compatibility-baseline.yaml`을 추가해 기존 operation path/status와 component schema/property 제거 또는 이동을 CI에서 실패 처리
- 기존 mobile health fixture 검증을 유지하면서 root `contract:check`와 CI contracts job이 같은 전체 validator를 실행하도록 확장
- `GAP-0004`를 RESOLVED 처리하고 API/테스트/상태/활성 계획 문서를 현재 gate와 일치시킴

### 변경 파일

- 계약/fixture: `contracts/openapi/**`, `contracts/operation-coverage.yaml`, `contracts/fixtures/**`, `contracts/testing/**`
- gate: `scripts/validate-contract-fixtures.mjs`
- provider test: `services/platform-api/test/identity/me.e2e.test.ts`, `services/institution-simulator/test/{health,account/**}`
- 문서: `INTEGRATED_DEVELOPMENT_PLAN.md`, `API_CONTRACTS.md`, `TEST_STRATEGY.md`, `IMPLEMENTATION_STATUS.md`, `ISSUE_REGISTER.md`, `DEVELOPMENT_LOG.md`

### 검증

- 명령: `npm run contract:check`
- 결과: OpenAPI 2개 lint, 20개 operation, 23개 fixture, controller/provider/consumer trace와 compatibility baseline 통과
- 명령: platform/simulator targeted provider test
- 결과: platform 13 tests, simulator 4 tests 통과; 현재 operation 성공 response와 주요 ProblemDetails schema 검증 포함
- 명령: platform/simulator strict typecheck와 lint
- 결과: 공용 ESM validator declaration을 포함해 통과
- 명령: `npm run verify`
- 결과: 첫 실행은 local Colima socket 자동 탐지 실패로 Testcontainers 시작 전에 종료됐다. `DOCKER_HOST=unix:///Users/switch/.colima/default/docker.sock`와 `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`를 명시해 동일 전체 gate를 재실행했고 formatter, 계약, Expo dependency, secret, architecture, lint, strict typecheck, mobile 60/simulator 7/platform 47 총 114 tests와 두 backend build가 모두 통과했다.

### 이슈와 누락

- `GAP-0004`: RESOLVED
- 신규 issue/gap 없음
- consumer adapter가 아직 없는 operation은 계획된 `FE-0010`~`FE-0013` target으로 machine-readable하게 유지하며 완료로 가장하지 않음

### 다음 작업

- `BE-0009`: simulator 시세·brokerage·scenario·reset/reseed와 platform quote HTTP adapter

## DEV-0011 — Clean Local MVP 12단계 인수

- 날짜: 2026-09-02
- Milestone: 2~5 local MVP acceptance
- 상태: COMPLETED
- 예정 commit: `test(integration): add clean local MVP acceptance [DEV-0011]`

### 완료

- `make acceptance-test`에 clean local volume→`npm ci`→verify→image build→migration→seed 2회→services→OIDC/business smoke→runtime audit 순서를 단일 명령으로 구현
- Docker context의 unix socket을 감지해 Colima Testcontainers의 host/container socket 경계를 자동 구성하는 root command wrapper 추가
- `MVP_SCOPE.md` 12단계 smoke에 raw/processing result, normalized wealth/history, persisted simulation, settlement DB 증거와 동일 idempotency key replay 단일 order를 추가
- Test Strategy의 모든 Make target과 destructive clean acceptance target을 구현하고 fresh-clone 절차/로컬 volume 주의를 README에 문서화

### 검증

- clean `npm ci`: 1,120 packages 설치, 기존 moderate 18/high 0/critical 0; force fix 미사용
- root verify: contract 31 operations/34 fixtures, mobile 95/simulator 12/platform 61 총 168 tests, 두 backend build
- clean Compose: platform/simulator migration, deterministic seed 2회, PostgreSQL healthy, Keycloak/platform/simulator health
- actual OIDC: PKCE S256, callback state, JWT issuer/audience/subject/scope/signature, `/me`, refresh restart, invalid token 401, logout/revocation
- actual 12-step smoke: raw/processed 3, account/transaction/history, simulation 13 points, normal FILLED, REJECTED, UNKNOWN→FILLED, identical-key replay, executions 2, audit 10
- 두 production image build와 workspace runtime audit vulnerability 0
- `make unit-test/integration-test/concurrency-test/mobile-test/backend-test/seed/reset-demo/smoke-test` 개별 진입점 재실행 통과
- 첫 `infra-down→infra-up→smoke-test` 연속 실행에서 Keycloak startup readiness race로 smoke가 실패해 `ISSUE-0011`로 기록. `infra-up`에 3-service bounded readiness gate를 추가한 뒤 동일 경로 재검증

### 이슈와 누락

- `GAP-0007` RESOLVED
- `ISSUE-0011` RESOLVED
- clean install의 moderate 18은 기존 `ISSUE-0002`/`ISSUE-0003`으로 계속 추적하며 production runtime은 0
- iOS/physical biometric 미검증은 기존 `GAP-0002`/`GAP-0003`으로 유지
- 실제 개인정보·계좌정보, 원격 DB/credential/migration/deploy는 사용하지 않음

### 다음 작업

- `BE-0012`: settlement transaction outbox와 idempotent publisher

## 새 기록 Template

```markdown
## DEV-#### — 제목

- 날짜: YYYY-MM-DD
- Milestone: N
- 상태: COMPLETED | BLOCKED | PARTIAL
- 예정 commit: `<type>(mN): <summary> [DEV-####]`

### 완료
- ...

### 변경 파일
- ...

### 검증
- 명령:
- 결과:

### 이슈와 누락
- ISSUE/GAP:

### 다음 작업
- DEV-####:
```

## FE-0010 — Live OIDC와 `/me` Mobile 통합

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- 예정 commit: `feat(fe): connect live OIDC current user [FE-0010]`

### 완료

- canonical `/api/v1/me`를 config missing/mock/real `PlatformApi` port와 authenticated adapter, current-user Query/UI에 연결
- clean local Keycloak의 `basic` subject와 offline refresh scope, 합성 사용자 멱등 provisioning과 PKCE/JWT/refresh/logout smoke 자동화
- Android API 36 Development Build에서 browser login→callback→App Lock fingerprint→실제 `/me`, process restart refresh와 logout/cache clear까지 검증
- callback unmatched route와 SafeAreaView deprecation을 live smoke에서 발견해 같은 slice에서 수정하고 issue history에 보존
- `GAP-0001`, `FE-GAP-0003`을 해결하고 Milestone 2를 DONE 처리

### 검증

- mobile architecture 74 files, lint, strict typecheck, 23 files/67 tests 통과
- Android 1,361-module Hermes export와 web 899-module export 통과
- Android native Gradle 484 tasks/APK install과 실제 Keycloak/biometric/platform UI flow 통과
- 볼륨 제거 clean Compose PKCE→JWT→`/me`→refresh-only restart→invalid 401→logout/revocation 통과
- Colima socket을 명시한 root `npm run verify`: mobile 67/simulator 12/platform 61, 총 140 tests와 두 backend build 통과

### 이슈와 누락

- `ISSUE-0008`: local Keycloak subject/offline scope 누락 RESOLVED
- `GAP-0001`: live OIDC/native restart RESOLVED
- `GAP-0002`: iOS Development Build runtime 유지
- `GAP-0003`: Android emulator 실제 prompt까지 좁혔으며 물리 biometric edge case만 유지

### 다음 작업

- `FE-0011`: MyData connection/sync와 Dashboard/Accounts vertical slice

## FE-0011 — MyData와 Dashboard Mobile 통합

- 날짜: 2026-09-02
- Milestone: 3
- 상태: COMPLETED
- 예정 commit: `feat(fe): add MyData wealth dashboard [FE-0011]`

### 완료

- canonical connection/sync와 자산 조회 10개 operation을 mobile strict adapter/fixture/Query와 화면에 연결
- server-authoritative summary, sync polling/invalidation, Accounts/detail/holdings/transactions와 history/allocation chart 구현
- money/quantity/masked identifier/null cursor 계약과 loading/empty/stale/partial error/retry, 접근성/Reduce Motion을 component/adapter test로 검증
- local PostgreSQL/Compose simulator와 실제 Platform API sync/wealth/order smoke 통과

### 검증

- mobile lint, strict typecheck와 26 files/75 tests 통과
- local actual smoke: account 1, transaction 1, history 1, FILLED/REJECTED/UNKNOWN→FILLED
- 첫 root verify는 local Colima socket 자동 탐지 실패로 Testcontainers가 시작 전에 종료됐고, socket을 명시해 동일 gate를 재실행
- Colima socket을 명시한 root `npm run verify`: mobile 75/simulator 12/platform 61 총 148 tests와 두 backend build 통과

### 이슈와 누락

- 신규 unresolved issue/gap 없음
- 원격 DB와 배포 작업은 실행하지 않음

### 다음 작업

- `FE-0012`: Simulation vertical slice

## FE-0012 — Persisted Simulation Mobile 통합

- 날짜: 2026-09-02
- Milestone: 4
- 상태: COMPLETED
- 예정 commit: `feat(fe): add persisted simulation flow [FE-0012]`

### 완료

- pre-submit Zustand draft와 TanStack create/get server state를 분리하고 저장된 simulation result만 화면에 표시
- canonical validation/problem code, strict version/percentile mapper와 p10/p50/p90 interactive chart 구현
- engine/assumption version, goal probability와 synthetic disclaimer를 노출하고 actual local create/get 13-point 결과 확인

### 검증

- mobile architecture 91 files, lint, strict typecheck와 28 files/82 tests 통과
- local actual sync/wealth/simulation/order smoke 통과
- feature 간 formatter import architecture 실패는 shared 계층 승격 후 해소
- root `npm run verify`: mobile 82/simulator 12/platform 61 총 155 tests와 두 backend build 통과

### 이슈와 누락

- `FE-ISSUE-0008` repeat smoke 충돌 RESOLVED
- `ISSUE-0009` duplicate connection 500 OPEN; DEV-0011 전 backend defect slice에서 해결
- 원격 DB와 배포 작업은 실행하지 않음

### 다음 작업

- `FE-0013`: BUY order와 UNKNOWN recovery mobile vertical slice

## FE-0015 — Wealth Flow 고객 UI 디자인 시스템

- 날짜: 2026-09-03
- Milestone: 7A 모바일 고객 UI 디자인 리팩터링
- 상태: COMPLETED
- base commit: `d7b802c8226be203dd5f62ee4b3a3af608970c4c`
- contract revision: `platform-v1` unchanged
- 예정 commit: `feat(fe): apply Wealth Flow design system [FE-0015]`

### 완료

- light-first color/typography/spacing/radius/shadow/motion token과 Wealth Flow brand module을 추가했다.
- AppText, Screen, PageHeader, Card, Button, field, money/metric/status/notice/list/empty/error primitive를 추가하고 component test를 작성했다.
- 홈·종목·플랜·내 정보 bottom tab과 주문 route를 도입했으며 기존 API/auth/AppLock/business hook 경계를 유지했다.
- customer UI의 dark raw hex와 샌드박스·데이터셋·개발자 도구 노출을 제거하고 데모 안내·금액 숨김·접근성 문구를 유지했다.
- 자산/시세 line·area 차트, 시뮬레이션 범위 chart tooltip과 Reduce Motion, 자산 배분 donut 표현을 적용했다.
- feature UI와 app route의 raw color/기술 문구를 검사하는 `design-system:check` gate를 추가했다.
- app 표시 이름을 Wealth Flow, light UI로 갱신하고 scheme/package identifier는 보존했다.

### 변경 파일

- `apps/mobile/src/shared/design-system/**`
- `apps/mobile/src/app/**`
- `apps/mobile/src/features/**/ui/**`
- `apps/mobile/src/features/market/model/market-display.ts`
- `apps/mobile/app.json`
- `apps/mobile/scripts/check-design-system.mjs`
- `apps/mobile/package.json`, `package.json`
- `docs/IMPLEMENTATION_STATUS.md`, `docs/ISSUE_REGISTER.md`

### 검증

- `npm run design-system:check -w @finapp/mobile`: 24 UI files 통과
- `npm run architecture:check -w @finapp/mobile`: 154 source files 통과
- `npm run lint -w @finapp/mobile`: 통과
- `npm run typecheck -w @finapp/mobile`: 통과
- `npm run test -w @finapp/mobile -- --run`: 35 files/104 tests 통과
- `make verify` (Node 24 + Colima local Docker wrapper): root format/contract/security/architecture/lint/typecheck/build, mobile 35/104, simulator 4/12, platform 19/90 통과
- 초기 공통 primitive typecheck 실패는 `ISSUE-0013`/`FE-ISSUE-0012`로 기록하고 수정 후 재검증했다.
- root cwd/Node PATH가 다른 Expo export 실패는 `ISSUE-0014`/`FE-ISSUE-0013`으로 기록하고 mobile cwd·Node 24 조건에서 재검증했다.
- shared primitive의 feature import 경계 위반은 `ISSUE-0015`/`FE-ISSUE-0014`로 기록하고 shared formatter/re-export adapter로 수정한 뒤 architecture gate를 통과했다.
- pull 직후 dependency/runtime verify drift는 `ISSUE-0016`/`FE-ISSUE-0015`로 기록했다. Node 24 `npm ci`, Colima wrapper와 50ms timeout fixture 조정 후 `make verify` 전체 gate를 통과했다.

### 이슈·누락·Handoff

- `ISSUE-0013`, `FE-ISSUE-0012` RESOLVED.
- 다음 slice에서 navigation/export smoke와 실제 iOS/Android 화면 회귀 검증을 추가한다.
- 원격 DB, credential, migration, seed와 배포는 실행하지 않았다.

### 다음 작업

- `FE-0016`: navigation/export smoke와 디자인 회귀 검증 보강

## BE-0012 — Settlement Transactional Outbox

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `feat(be): add transactional settlement outbox [BE-0012]`

### 완료와 검증

- terminal settlement와 같은 transaction에서 redacted outbox event를 기록하고, PostgreSQL lease worker와 durable delivery receipt 기반 local idempotent publisher를 구현했다.
- migration `0007_finapp_outbox`, prefix/권한, 동시 claim, stale lease/crash-window duplicate, retry/max-attempt unit·Testcontainers 검증을 통과했다.
- actual Compose forward migration 뒤 OIDC/business smoke가 outbox event/delivery 각 3건을 확인했다. 원격 자원은 사용하지 않았다.
- root verify는 mobile 95/simulator 12/platform 64 총 171 tests와 두 backend build를 통과했다.

### 이슈와 다음 작업

- `ISSUE-0012`, `BE-ISSUE-0004`, `BE-ISSUE-0005` RESOLVED.
- 다음은 `BE-0013` local DataKeyProvider/AWS KMS 경계와 wrong AAD test다.

## BE-0013 — Local Envelope Crypto와 AWS KMS Adapter Boundary

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `feat(be): harden data key provider boundary [BE-0013]`

### 완료와 검증

- MyData crypto를 async DataKeyProvider로 분리하고 local wrapped-DEK `FAE2` envelope, contextual AAD, stable lookup MAC과 plaintext key zero-fill을 구현했다.
- AWS KMS GenerateDataKey/Decrypt/GenerateMac adapter는 fake client로만 검증했으며 실제 AWS 연결·credential은 사용하지 않았다.
- wrong owner AAD/tamper/profile 차단, Testcontainers 신규 envelope와 보존 Compose legacy synthetic read actual smoke가 통과했다.
- root verify는 mobile 95/simulator 12/platform 68 총 175 tests와 두 backend build를 통과했다.

### 이슈와 다음 작업

- `BE-ISSUE-0006` RESOLVED.
- 다음은 `BE-0014` security event, structured log/redaction와 production bootstrap 검증이다.

## BE-0014 — Security Event, Structured Log와 Production Isolation

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `feat(be): add security event observability [BE-0014]`

### 완료와 검증

- authn/authz 실패를 append-only security event로 기록하고 raw IP/token/subject 대신 keyed hash와 allowlist metadata만 저장한다.
- query/header/body 비수집 structured HTTP log와 actual production bootstrap developer route 404를 구현·검증했다.
- migration 9 tests, non-integration 62 tests와 actual Compose security event 1건/structured logs/12단계 smoke가 통과했다.
- root verify는 mobile 95/simulator 12/platform 71 총 178 tests와 두 backend build를 통과했다.

### 이슈와 다음 작업

- `BE-ISSUE-0007` RESOLVED.
- 다음은 `BE-0015` readiness/metrics와 external HTTP circuit breaker다.

## BE-0015 — Readiness, Metrics와 External Circuit Breaker

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `feat(be): harden readiness and external resilience [BE-0015]`

### 완료와 검증

- DB timeout readiness, private bounded metrics와 MyData/market/brokerage closed/open/half-open circuit breaker를 구현했다.
- canonical 계약을 33 operations/36 fixtures로 확장하고 actual Fastify provider 200/503, loopback HTTP no-order-POST와 platform 77 tests를 검증했다.
- root verify는 mobile 95/simulator 12/platform 77 총 184 tests와 두 backend build를 통과했다.
- actual Compose rebuild에서 DB readiness와 metrics를 확인하고 OIDC 포함 12단계 smoke, outbox event/delivery 3/3을 재검증했다.
- 주문 POST 자동 retry, 장시간 DB transaction, 원격 DB·credential·catalog·migration/seed·deploy는 사용하지 않았다.

### 이슈와 다음 작업

- `BE-ISSUE-0008` RESOLVED.
- 다음은 `DEV-0012` 제품 범위 재확정 및 선택 항목 구현이다.

## DEV-0012 — Risk Profile 범위 재확정과 편집

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `feat(dev): add versioned risk profile settings [DEV-0012]`

### 완료와 검증

- 별도 onboarding wizard와 portfolio recommendation을 구현하지 않기로 재확정하고, OIDC default profile + Settings owner 편집만 완료 범위로 고정했다.
- `GET|PUT /api/v1/me/risk-profile`의 scope, strict input, optimistic version 409와 audit를 구현했다.
- mobile strict adapter/mock/unavailable boundary와 접근 가능한 성향·기간·월 납입액 Settings 편집, no-advice 문구를 구현했다.
- canonical 계약은 35 operations/38 fixtures로 확장됐고 provider/consumer/compatibility gate를 통과했다.
- PostgreSQL에서 version 0→1과 stale update 무효, actual Compose OIDC refresh access token GET→PUT version 1회 증가와 기존 12단계 smoke를 통과했다.
- root verify는 mobile 97/simulator 12/platform 80 총 189 tests와 두 backend build를 통과했다.
- DB migration과 원격 DB·credential·catalog·migration/seed·deploy는 사용하지 않았다.

### 이슈와 다음 작업

- `BE-ISSUE-0009` provisioning/profile port coupling과 `FE-ISSUE-0011` production 저장 message 미노출을 해결했다.
- 다음은 `DEV-0013` 핵심 query plan과 dependency advisory/release risk 재검증이다.

## DEV-0013 — Local Query Plan과 Dependency Release Gate

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `perf(dev): verify local query and dependency gates [DEV-0013]`

### 완료와 검증

- runtime app role로 asset snapshot, account holding, owner order page와 reconciliation claim 네 JSON plan을 실행하는 `make performance-test`를 추가했다.
- 주문 keyset order의 UUID tie-breaker가 기존 index에 없어 발생한 incremental sort를 `0009_finapp_order_list_index`로 제거했다.
- 최종 보존 Compose plan은 0.228/0.329/1.524/0.347ms였고 모두 expected prefix index와 100ms ceiling을 통과했다.
- 빈 Testcontainers PostgreSQL은 migration history 10개, prefix/role/권한과 기존 domain integration을 통과했다.
- registry current stable과 pin을 비교하고 root audit moderate 18/high 0/critical 0, 두 backend production image workspace audit 0을 재확인했다.
- local release는 조건부 통과로 판정했다. `ISSUE-0002`/`ISSUE-0003`은 원격 preview security-clean 판정 전에 upstream 해소 또는 사용자 위험 수용이 필요하다.
- 원격 DB·endpoint/credential·catalog·migration/seed·deploy는 사용하지 않았다.

### 이슈와 다음 작업

- `GAP-0009` RESOLVED.
- 다음은 `DEV-0014` 최종 portfolio documentation과 clean local acceptance다.

## DEV-0014 — 최종 로컬 하드닝과 포트폴리오 인수

- 날짜: 2026-09-02
- Milestone: 6A local hardening
- 상태: COMPLETED
- 예정 commit: `chore(dev): finalize local hardening acceptance [DEV-0014]`

### 완료와 검증

- architecture/sequence/security, limitations, requirements traceability와 3분 demo 문서를 최종 구현 증거에 맞춰 작성했다.
- `make acceptance-test`에 runtime application role의 네 query plan gate를 포함했다.
- local 전용 Compose volume을 제거하고 clean `npm ci`, root contract/secret/architecture/lint/typecheck/test/build를 재현했다.
- mobile 97, simulator 12, platform 80 총 189 tests와 두 production image build를 통과했다.
- 빈 PostgreSQL에 platform migration 10개와 simulator migration, deterministic seed 2회를 적용했다.
- actual PKCE/JWT/refresh/logout/risk-profile, 12단계 sync/simulation/FILLED/REJECTED/UNKNOWN→FILLED, outbox 3건을 통과했다.
- clean query plan은 0.213/0.308/0.357/0.348ms로 expected index와 100ms ceiling을 통과했고 두 image runtime audit은 0이었다.
- 최종 JSON은 `acceptance=passed`, `clean=true`, `scenarioSteps=12`, `remoteResourcesUsed=false`다.

### 이슈와 종료선

- 신규 defect/gap은 발견되지 않았다.
- `ISSUE-0002`/`ISSUE-0003`, `GAP-0002`/`GAP-0003`은 삭제하지 않고 원격 preview/실기기 재확인 대상으로 유지한다.
- 원격 DB·endpoint/credential·catalog·migration/seed·deploy는 사용하지 않았다.
- 단계 10을 완료했으므로 `origin/main` push 뒤 단계 11 전에 STOP한다.

## FE-0013 — Biometric BUY와 Recovery Mobile 통합

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- 예정 commit: `feat(fe): add biometric BUY recovery flow [FE-0013]`

### 완료

- opaque instrument ID 기반 preview, expiry와 biometric gate 뒤 idempotent BUY를 구현
- POST no-retry, UNKNOWN GET polling과 FILLED wealth/order invalidation 및 order history/error 상태 구현
- canonical quote/order 4 operation consumer와 strict response/cursor guard 연결

### 검증

- mobile architecture 95 files, lint, strict typecheck와 29 files/88 tests 통과
- actual local FILLED/REJECTED/UNKNOWN→FILLED full smoke 통과
- root `npm run verify`: mobile 88/simulator 12/platform 61 총 161 tests와 두 backend build 통과

### 이슈와 누락

- `FE-ISSUE-0009` RESOLVED
- 원격 DB와 배포 작업은 실행하지 않음

### 다음 작업

- `FE-0014`: Settings/developer scenario/accessibility

## FE-0014 — Safe Settings와 Local/Demo Scenario Control

- 날짜: 2026-09-02
- Milestone: 2~5 local MVP
- 상태: COMPLETED
- 예정 commit: `feat(fe): add safe settings and scenario controls [FE-0014]`

### 완료

- dataset/synthetic 안내, logout, 핵심 화면·차트 접근성 텍스트를 포함한 금액 숨기기와 설정 tab 완성
- local/demo 명시 profile에서만 scenario/reset panel을 노출하고 production·누락·미지 환경을 fail-closed 처리
- developer 2 operation consumer를 canonical strict HTTP/mock port로 전환하고 private simulator instrument endpoint의 mobile 직접 소비를 금지

### 검증

- mobile architecture/lint/strict typecheck, 31 files/95 tests 통과
- actual local Compose sync/simulation/FILLED/REJECTED/UNKNOWN reconciliation/reset smoke 통과
- production component에 developer UI/route 진입점이 없고 reset HTTP가 bodyless POST임을 검증
- 첫 root verify의 기존 Colima Ryuk socket mount 실패는 host·container socket 두 환경 값을 모두 지정해 해소하고, 최종 mobile 95/simulator 12/platform 61 총 168 tests와 두 backend build 통과

### 이슈와 누락

- `ISSUE-0010` synthetic session fixture secret scan 오탐을 placeholder로 해소; 기존 Expo advisory, iOS/physical biometric gap은 유지
- 원격 작업은 실행하지 않음

### 다음 작업

- `DEV-0011`: clean local full-stack 12-step acceptance

## BE-0011 — FE-0013 Contract Entry Repair

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- 예정 commit: `fix(be): expose order instrument identity [BE-0011]`

### 완료

- Holding에 order preview용 opaque `instrumentId`를 additive로 노출하고 backend/provider/mobile contract를 동기화
- Drizzle wrapped PostgreSQL unique conflict를 domain error로 변환해 duplicate MyData connection 500을 canonical 409로 복구
- repeatable smoke의 existing connection과 사용자 action별 idempotency key 수명주기를 보강

### 검증

- contract gate, provider 13 tests와 PostgreSQL Testcontainers 8 tests 통과
- actual local duplicate connection 409와 full sync/simulation/order smoke 통과
- Colima socket을 명시한 root `npm run verify`: mobile 82/simulator 12/platform 61 총 155 tests와 두 backend build 통과

### 이슈와 누락

- `GAP-0008`, `ISSUE-0009` RESOLVED
- 원격 DB와 배포 작업은 실행하지 않음

### 다음 작업

- `FE-0013`: BUY order와 UNKNOWN recovery mobile vertical slice
