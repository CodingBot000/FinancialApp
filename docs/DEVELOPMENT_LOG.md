# 개발 로그

- 기록 방식: append-only
- 마지막 DEV ID: `DEV-0003`
- 다음 DEV ID: `DEV-0004`

모든 개발 commit은 하나의 `DEV-####`와 연결한다. commit subject에도 같은 ID를 넣어 Git history와 문서 기록을 상호 추적할 수 있게 한다.

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
