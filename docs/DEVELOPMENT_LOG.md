# 개발 로그

- 기록 방식: append-only
- 마지막 DEV ID: `DEV-0006`
- 다음 DEV ID: `DEV-0007`

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
