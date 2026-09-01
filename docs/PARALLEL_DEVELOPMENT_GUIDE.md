# 프론트엔드·백엔드 병렬 개발 운영 지침

- 상태: DEV-0006에서 병렬 단계 종료, 이 문서는 이력/재분리 기준으로 보존
- 작성일: 2026-09-01
- 적용 대상: Codex frontend session, backend session과 integration owner

## 0. 현재 운영 상태

- `codex/backend`의 BE-0001~BE-0008과 `codex/frontend`의 FE-0001~FE-0009는 2026-09-02 DEV-0006에서 `main`에 통합했다.
- 두 branch는 `origin/codex/backend`, `origin/codex/frontend`에 이력으로 보존한다.
- 로컬 보조 worktree directory는 변경사항이 없는 것을 확인한 뒤 DEV-0008에서 제거했다.
- 이후 신규 개발은 사용자의 결정에 따라 단일 `main` 작업 흐름에서 직렬 진행한다.
- 현재 활성 순서와 완료 조건은 `INTEGRATED_DEVELOPMENT_PLAN.md`를 따른다.
- 이 문서의 worktree/session 규칙은 향후 다시 병렬화할 때만 적용한다. 별도 결정 없이 기존 worktree branch에서 신규 commit을 만들지 않는다.

## 1. 결론

프론트엔드와 백엔드를 두 Codex session에서 병렬 개발한다. 단, 같은 working directory나 같은 branch를 동시에 사용하지 않는다. 병렬 개발은 다음 조건을 모두 지킬 때만 허용한다.

1. session마다 별도 Git worktree와 branch를 사용한다.
2. frontend와 backend의 파일 소유권을 분리한다.
3. API 계약과 mock fixture는 같은 version을 사용한다.
4. session별 commit ID, 개발 로그와 issue register를 사용한다.
5. shared file, migration과 main merge는 한 명의 integration owner만 직렬로 처리한다.
6. main에 통합된 상태에서 전체 품질 gate를 통과해야 milestone 완료로 인정한다.

기본 integration owner는 backend session이다. 사용자가 별도 통합 session을 지정하면 그 session이 이 역할을 인계받을 수 있다.

## 2. 병렬 시작 전 필수 기준선

병렬 session을 시작하기 전에 integration owner가 한 번의 직렬 작업으로 다음을 main에 commit한다.

- root npm workspace와 공통 명령
- `apps/mobile`, `services/platform-api`, `services/institution-simulator` scaffold
- root `package-lock.json`, TypeScript/ESLint/Vitest baseline
- OpenAPI artifact 위치와 생성·검증 명령
- frontend mock adapter 위치와 deterministic fixture 규칙
- CI의 frontend/backend/integration job 골격

`DEV-0005`에서 이 공통 scaffold를 구현·검증한다. `DEV-0005` 완료 commit을 두 session의 공통 base commit으로 사용하며, 각 session은 시작 시 실제 commit SHA를 자신의 workstream 로그에 기록한다. 공통 base가 없는 상태에서 각 session이 독립적으로 root workspace를 만들지 않는다.

worktree 생성 예시는 다음과 같다. 실제 branch 이름이 이미 존재하면 충돌하지 않는 이름을 사용한다.

```bash
git worktree add ../FinancialApp-frontend -b codex/frontend main
git worktree add ../FinancialApp-backend -b codex/backend main
```

두 session은 시작할 때 base commit SHA를 각 workstream 로그에 기록한다.

## 3. 파일 소유권

| 영역 | 주 소유자 | 규칙 |
|---|---|---|
| `apps/mobile/**` | frontend | 화면, mobile state, API client, mock adapter와 mobile test |
| `services/**` | backend | NestJS/Fastify 서비스, Drizzle repository와 backend test |
| `infra/**` | backend | Compose, runtime image, Lightsail deployment와 DB bootstrap |
| `contracts/openapi/**` | backend | machine-readable API 계약의 canonical owner |
| `docs/workstreams/frontend/**` | frontend | frontend commit, issue와 gap 추적 |
| `docs/workstreams/backend/**` | backend | backend commit, issue와 gap 추적 |
| root config와 `package-lock.json` | integration owner | merge 후 재생성·전체 검증; conflict를 손으로 이어 붙이지 않음 |
| 공통 계약·결정·상태 문서 | integration owner | 두 workstream 변경을 통합한 commit에서 갱신 |
| DB migration | backend 중 지정된 migration owner | 동시에 한 session만 생성·적용 |

각 lane은 자신의 worktree에서 dependency 검증을 위해 branch-local `package-lock.json`을 생성할 수 있다. main에 들어갈 최종 lockfile의 소유권은 integration owner에게 있으며, 양쪽 manifest를 통합한 뒤 package manager로 다시 생성하고 clean install을 검증한다.

공통 계약·결정·상태 문서는 다음을 포함한다.

- `docs/API_CONTRACTS.md`
- `docs/TABLE_DEFINITIONS.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/ISSUE_REGISTER.md`
- `docs/adr/**`

frontend session은 공통 문서를 직접 수정하는 대신 자신의 로그에 `CONTRACT_CHANGE_REQUEST`를 기록하고 handoff 문서를 추가한다. backend 또는 integration owner가 계약 변경을 먼저 통합한 뒤 frontend가 새 revision을 소비한다.

## 4. Branch와 merge 규칙

- 두 session은 main에 직접 동시에 commit하지 않는다.
- 각 session은 시작 시 `git status --short --branch`와 base commit을 확인한다.
- 상대 session의 소유 파일을 수정해야 하면 직접 고치지 말고 handoff를 남긴다.
- integration owner는 검증된 작은 commit 단위로 frontend와 backend branch를 통합한다.
- merge 전에 공통 base 이후 변경 파일을 확인하고 소유권 중복을 해결한다.
- `package-lock.json`이 충돌하면 두 쪽 `package.json` 변경을 먼저 통합한 뒤 lockfile을 package manager로 재생성한다. conflict marker를 수동 편집해 lockfile을 완성하지 않는다.
- main 통합 과정에서 실패한 test를 skip하거나 warning으로 낮추지 않는다.
- 통합 완료 후 각 worktree는 최신 main을 반영한 뒤 다음 작업을 시작한다. 이미 공유된 commit을 amend/reset/rebase해 추적 기록을 지우지 않는다.

## 5. Session별 Commit과 기록

ID namespace를 분리한다.

| 작업 | Commit ID | Commit 예시 | 기록 문서 |
|---|---|---|---|
| frontend | `FE-####` | `feat(fe): add dashboard states [FE-0001]` | `docs/workstreams/frontend/DEVELOPMENT_LOG.md` |
| backend | `BE-####` | `feat(be): expose assets endpoint [BE-0001]` | `docs/workstreams/backend/DEVELOPMENT_LOG.md` |
| 통합·공통 문서 | `DEV-####` | `chore(m1): integrate health slice [DEV-0006]` | `docs/DEVELOPMENT_LOG.md` |

frontend issue/gap은 `FE-ISSUE-####`, `FE-GAP-####`, backend는 `BE-ISSUE-####`, `BE-GAP-####`를 사용한다. 두 영역 또는 milestone 완료에 영향을 주는 항목은 integration owner가 중앙 `ISSUE-####` 또는 `GAP-####`에도 연결한다.

각 session commit은 반드시 다음을 포함한다.

- 완료한 요구사항과 변경 파일
- 실행한 formatter, lint, typecheck와 test 결과
- 사용한 API contract revision 또는 base commit
- 미완료·미검증·다른 session에 필요한 handoff
- 다음 session-local 작업

## 6. API 계약과 frontend mock

### 6.1 계약 소유권

- Milestone 1에서 `contracts/openapi/platform-v1.yaml`을 canonical machine-readable contract로 생성한다.
- backend는 controller DTO와 OpenAPI artifact의 일치를 CI에서 검증한다.
- frontend는 특정 contract commit SHA를 기준으로 API type과 mock response를 생성하거나 검증한다.
- 호환되지 않는 변경은 frontend가 이전 계약을 소비하는 동안 main에 통합하지 않는다.
- 가능한 변경은 optional field 또는 새 endpoint를 추가하는 additive change로 만든다.
- field 삭제, type 변경, enum 축소와 의미 변경은 ADR, migration 계획과 양쪽 session 승인이 필요하다.

### 6.2 Mock 규칙

frontend가 backend 없이 개발할 수 있도록 `apps/mobile`의 API transport 뒤에 contract mock adapter를 둔다.

- mock payload는 OpenAPI schema validation을 통과해야 한다.
- fixture는 고정 seed와 `datasetVersion`을 사용한다.
- loading, empty, partial, error, timeout, unauthorized와 stale 상태를 포함한다.
- money/quantity는 실제 API와 동일한 decimal string을 사용한다.
- mock 전용 field나 화면 편의를 위한 비계약 응답을 만들지 않는다.
- component가 mock module을 직접 import하지 않고 같은 API port를 통해 사용한다.
- backend endpoint가 준비되면 같은 contract test를 실제 API에도 실행한다.

mock 데이터는 frontend 병렬 개발을 가능하게 하지만 실제 backend integration test를 대체하지 않는다.

## 7. 원격 Lightsail PostgreSQL 규칙

합성 데이터라는 사실은 개인정보 노출 위험을 낮추지만, 공유 DB의 migration 충돌, schema 오염, credential 유출과 다른 서비스 훼손 위험을 제거하지 않는다.

### 7.1 접근 소유권

- frontend session은 원격 DB credential을 받거나 DB에 직접 연결하지 않는다.
- backend session 중 지정된 migration owner만 원격 migration을 수행한다.
- 다른 backend 작업과 자동 test는 local PostgreSQL 또는 Testcontainers를 사용한다.
- 원격 DB는 `demo` integration/smoke와 최종 시연 데이터를 위해 사용한다.

### 7.2 최초 연결과 migration

- endpoint, engine/version, TLS, database/schema, role과 backup 가능 여부를 먼저 확인한다.
- 사용자의 원격 migration 승인 전에는 read-only catalog 확인만 허용한다.
- 모든 application-owned schema/table/index/constraint와 migration history에 `finapp_` prefix를 사용한다.
- platform, simulator, migration과 Keycloak role을 분리한다.
- migration은 한 번에 한 owner만 적용하고 적용 commit SHA와 결과를 backend log에 기록한다.
- shared/demo DB에서 `drizzle-kit push`, destructive reset, `DROP DATABASE`, `DROP SCHEMA`와 기존 객체 rename을 금지한다.
- seed는 idempotent하고 dataset version이 명시되어야 하며 다른 서비스 객체를 조회·수정하지 않는다.

### 7.3 테스트와 데이터

- unit/integration/concurrency test는 원격 DB를 사용하지 않는다.
- migration test는 빈 Testcontainers DB와 이전 version fixture에서 수행한다.
- 원격에서는 migration smoke, role isolation, TLS와 최소 end-to-end 시나리오만 실행한다.
- 원격 상태에 의존하는 test를 main CI의 필수 gate로 만들지 않는다.
- 합성 데이터라도 실제 계좌번호 형식, 실제 사용자 식별정보나 운영 credential을 섞지 않는다.

## 8. Handoff 규칙

다른 session의 변경이 필요하면 `docs/handoffs/YYYYMMDD-<source>-<topic>.md`를 추가하고 자신의 workstream log에서 연결한다.

```markdown
# Handoff 제목

- Source: frontend | backend
- Target: frontend | backend | integration
- 상태: OPEN | ACCEPTED | RESOLVED
- 관련 commit/ID:
- contract revision:
- 필요한 변경:
- 호환성 영향:
- 검증 조건:
- 차단 여부:
```

handoff가 있어도 독립적으로 가능한 작업은 계속한다. 상대 session 결과를 추측해 임시 production API나 임시 DB column을 만들지 않는다.

## 9. 통합 Gate

다음 조건을 모두 만족해야 병렬 결과를 main의 완료된 vertical slice로 인정한다.

1. frontend와 backend 각 workstream test가 통과한다.
2. backend 구현과 canonical OpenAPI artifact가 일치한다.
3. frontend mock과 API client가 같은 OpenAPI revision을 사용한다.
4. 실제 backend 또는 simulator를 이용한 contract/integration smoke가 통과한다.
5. root lockfile을 재생성한 뒤 clean install, lint, typecheck와 test가 통과한다.
6. 중앙 상태·개발 로그·issue register와 관련 계약 문서가 갱신됐다.
7. 원격 DB를 사용했다면 migration SHA, dataset version과 검증 결과가 기록됐다.

## 10. Session 시작 지시문

### Frontend session

```text
PARALLEL_DEVELOPMENT_GUIDE.md와 frontend workstream 문서를 먼저 읽어라.
별도 frontend worktree/branch에서 apps/mobile/**와 docs/workstreams/frontend/**만 소유한다.
API는 지정된 OpenAPI revision과 contract mock adapter를 통해 사용하고 DB에 직접 연결하지 않는다.
각 단계는 FE-#### commit과 frontend log/issue 갱신을 포함한다.
공통 계약 변경이 필요하면 직접 수정하지 말고 handoff를 남긴 뒤 독립 작업을 계속한다.
```

### Backend session

```text
PARALLEL_DEVELOPMENT_GUIDE.md와 backend workstream 문서를 먼저 읽어라.
별도 backend worktree/branch에서 services/**, infra/**, contracts/openapi/**와 docs/workstreams/backend/**를 소유한다.
NestJS/Fastify, Drizzle, PostgreSQL과 finapp_ prefix 기준을 지키고 각 단계는 BE-#### commit과 backend log/issue 갱신을 포함한다.
자동 테스트는 local/Testcontainers를 사용하고 원격 migration은 사용자 승인과 단일 migration owner 조건을 만족할 때만 수행한다.
기본 integration owner로서 shared file과 root lockfile 변경을 직렬 통합하고 main gate를 검증한다.
```

## 11. 공식 근거

- [Git worktree](https://git-scm.com/docs/git-worktree) — 하나의 repository에 연결된 복수 working tree 운영
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — frontend/backend가 공유할 machine-readable HTTP 계약
- [Drizzle migration configuration](https://orm.drizzle.team/docs/drizzle-config-file#migrations) — versioned migration과 history 설정
- [Testcontainers for Node.js PostgreSQL](https://node.testcontainers.org/modules/postgresql/) — 격리된 PostgreSQL integration test
- [Lightsail PostgreSQL SSL](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-connecting-to-postgres-database-using-ssl.html) — 원격 DB TLS 연결 기준
