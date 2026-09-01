# Backend Workstream 개발 로그

- 기록 방식: append-only
- 다음 ID: `BE-0002`
- branch/worktree: `codex/backend` / `/Users/switch/Development/Web/FinancialApp-backend`
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1`, `institution-simulator-v1` at BE-0001
- migration owner: backend session 또는 integration owner가 작업마다 기록

backend session은 `services/**`, `infra/**`, OpenAPI와 migration 변경을 commit 단위로 기록한다. 중앙 `DEVELOPMENT_LOG.md`는 integration owner 역할로 통합할 때만 수정한다.

## BE-0001 — Drizzle migration과 로컬 인프라 격리 기준선

- 날짜: 2026-09-01
- Milestone: 1
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1`, `institution-simulator-v1` (health trace headers 추가)
- migration owner: backend session; local Compose/Testcontainers만 적용
- commit: `feat(be): establish isolated database baseline [BE-0001]`

### 완료

- `codex/backend`와 별도 backend worktree에서만 작업했다.
- 두 서비스에 Drizzle ORM/Kit, PostgreSQL driver와 service별 migration runner/config/directory를 추가했다.
- history를 `finapp_meta.finapp_platform_drizzle_migrations`와 `finapp_meta.finapp_simulator_drizzle_migrations`로 분리했다.
- 모든 platform/simulator application schema와 생성된 table/index/constraint를 검사하는 PostgreSQL 17 Testcontainers migration test를 추가했다.
- local PostgreSQL role/schema bootstrap으로 migration/platform/simulator/Keycloak 권한을 분리하고 runtime role의 교차 schema 접근과 DDL을 차단했다.
- PostgreSQL 17.6, Keycloak 26.7.3, 두 NestJS/Fastify service와 migration tool profile을 포함하는 Compose를 추가했다.
- 요청/상관 ID를 Fastify lifecycle에서 수락·생성·응답 전파하고 health OpenAPI 계약에 반영했다.
- dependency-cruiser로 cycle, layer 역방향과 platform/simulator source 교차 import를 차단했다.

### 변경 파일

- `services/platform-api/**`
- `services/institution-simulator/**`
- `infra/database/**`, `infra/docker/**`, `infra/keycloak/**`
- `contracts/openapi/platform-v1.yaml`, `contracts/openapi/institution-simulator-v1.yaml`
- `package-lock.json` (backend branch-local dependency 재생성)
- `docs/workstreams/backend/**`

### 검증

- 명령: Node `v24.19.0`, npm `11.17.0`에서 두 workspace lint/typecheck/dependency-cruiser/Vitest/build
- 결과: platform 4 tests, simulator 3 tests 통과; 실제 PostgreSQL 17.6 Testcontainers migration/history/prefix/role isolation 포함
- 명령: Redocly OpenAPI lint와 contract fixture validation
- 결과: 두 canonical contract와 기존 frontend health fixture 통과
- 명령: 두 production Docker image build
- 결과: Node 24.19.0 image에서 build 성공, runtime dependency audit vulnerability 0
- 명령: clean Compose bootstrap, 두 service migration profile, health/Keycloak discovery/role catalog query
- 결과: history table 각 1 migration, prefix 위반 0, platform→simulator와 simulator→platform schema privilege 모두 false, runtime role database CREATE 모두 false
- 명령: formatter, secret scan, `git diff --check`
- 결과: 통과

### 원격 DB

- 사용 여부: 사용하지 않음
- migration commit/dataset version: local/Testcontainers `0000` baseline / `FINANCIAL_APP_DATASET_V1`
- 결과: Lightsail 연결, migration과 seed 모두 미실행

### 이슈·누락·Handoff

- `BE-ISSUE-0001`: Drizzle Kit build-time transitive moderate advisory. runtime image 영향 없음, upstream stable 갱신 필요.
- Handoff: health 응답의 `X-Request-Id`, `X-Correlation-Id` canonical contract가 BE-0001에서 추가됨.

### 다음 작업

- BE-0002: identity schema, `jose` remote JWKS guard, scope/ownership baseline과 `/api/v1/me` 구현

## 새 기록 Template

```markdown
## BE-#### — 제목

- 날짜: YYYY-MM-DD
- Milestone: N
- 상태: COMPLETED | BLOCKED | PARTIAL
- base commit:
- contract revision:
- migration owner:
- commit: `<type>(be): <summary> [BE-####]`

### 완료
- ...

### 변경 파일
- ...

### 검증
- 명령:
- 결과:

### 원격 DB
- 사용 여부:
- migration commit/dataset version:
- 결과:

### 이슈·누락·Handoff
- BE-ISSUE/BE-GAP/Handoff:

### 다음 작업
- BE-####:
```
