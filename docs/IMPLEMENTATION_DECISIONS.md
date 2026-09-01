# 구현 결정 기록

- 상태: 실행 기준선
- 마지막 갱신: 2026-09-02

이 문서는 ADR보다 작은 구현 결정을 한곳에 기록한다. `PENDING` 항목은 해당 milestone 전에 해결해야 한다.

## 결정 목록

| ID | 상태 | 결정 |
|---|---|---|
| D-001 | ACCEPTED | 저장소는 `apps/mobile`, `services/platform-api`, `services/institution-simulator` 구조를 사용한다. |
| D-002 | ACCEPTED | backend 두 서비스는 Node.js 24 LTS, TypeScript strict와 NestJS 12를 사용한다. |
| D-003 | ACCEPTED | backend와 mobile은 npm workspaces로 버전·도구 설정을 공유하지만 서비스 간 domain type, Drizzle schema, repository와 migration을 공유하지 않는다. |
| D-004 | ACCEPTED | 모바일은 Expo SDK 57, React Native 0.86, React 19.2.3과 npm을 사용한다. |
| D-005 | ACCEPTED | native package는 `npx expo install`이 선택한 호환 버전을 사용한다. |
| D-006 | ACCEPTED | Reanimated는 New Architecture에서 사용하며 chart stack은 Milestone 1 smoke test 후 lock한다. |
| D-007 | ACCEPTED | Keycloak 26.7.3을 local/demo IdP로 사용한다. 모바일 client는 public client이며 PKCE S256을 강제한다. |
| D-008 | ACCEPTED | access token은 메모리, refresh token은 SecureStore에 저장한다. token을 Zustand/AsyncStorage에 저장하지 않는다. |
| D-009 | ACCEPTED | 로컬 DB는 PostgreSQL 17 major를 사용한다. 원격 연결 전 실제 Lightsail engine과 호환성을 다시 확인한다. |
| D-010 | ACCEPTED | platform과 simulator는 같은 로컬 PostgreSQL instance를 사용할 수 있지만 schema와 login role을 분리한다. |
| D-011 | ACCEPTED | simulator 연동은 HTTP로만 수행하며 platform role은 `finapp_simulator` schema를 조회할 수 없다. |
| D-012 | ACCEPTED | MVP는 단일 기관과 `BALANCED_WORKER` dataset만 구현한다. |
| D-013 | ACCEPTED | raw payload row는 immutable하고 처리 상태/오류는 별도 processing result에 기록한다. |
| D-014 | ACCEPTED | 동일 payload 재수신도 새 raw batch로 기록한다. 중복 제거는 scoped checksum과 external key로 수행한다. |
| D-015 | ACCEPTED | MyData sync, reconciliation, outbox는 PostgreSQL job table과 Nest scheduler trigger를 사용한다. Kafka를 사용하지 않는다. |
| D-016 | ACCEPTED | MVP 주문은 BUY market order와 full fill/reject/unknown만 지원한다. |
| D-017 | ACCEPTED | 주문 상태는 `CREATED`, `FUNDS_RESERVED`, `PENDING_SUBMISSION`, `UNKNOWN`, `FILLED`, `REJECTED`, `FAILED`만 사용한다. |
| D-018 | ACCEPTED | 주문 HTTP 호출은 DB transaction 밖에서 수행한다. |
| D-019 | ACCEPTED | 현금 동시성은 `SELECT FOR UPDATE` 기반 pessimistic lock으로 보호한다. |
| D-020 | ACCEPTED | idempotency unique key는 `(user_id, operation, idempotency_key)`이고 request hash 불일치 시 conflict를 반환한다. |
| D-021 | ACCEPTED | simulation은 monthly step, deterministic seed, 약 1,000 paths를 기본값으로 사용한다. |
| D-022 | ACCEPTED | 서버 응답 money/quantity는 JSON string decimal로 직렬화한다. |
| D-023 | ACCEPTED | 시간은 DB에서 UTC `timestamptz`, API에서 ISO-8601 UTC로 표현한다. |
| D-024 | ACCEPTED | 환경은 `local`, `test`, `demo`, `production`으로 구분한다. dev scenario endpoint는 demo에서만 scope로 보호하고 production module에는 controller/provider를 등록하지 않는다. |
| D-025 | ACCEPTED | 원격 DB migration, KMS, 배포는 사용자 승인과 환경정보 확인 전 실행하지 않는다. |
| D-026 | ACCEPTED | 모든 애플리케이션 소유 schema, table, index, constraint와 Drizzle migration history table에 `finapp_` prefix를 사용한다. |
| D-027 | ACCEPTED | Keycloak vendor table은 rename하지 않고 별도 `finapp_keycloak` database를 우선 사용한다. 별도 database가 불가능한 경우 전용 `finapp_keycloak` schema와 role로 격리한다. |
| D-028 | ACCEPTED | platform-api는 NestJS feature module 기반 모듈형 모놀리스로 구현하고 dependency-cruiser와 ESLint로 module·layer 경계를 자동 검증한다. |
| D-029 | ACCEPTED | mobile은 Expo Router route adapter와 feature-first 구조를 사용하며 의존 방향은 `app → features → shared`로 제한한다. |
| D-030 | ACCEPTED | mobile server state는 TanStack Query, 소량의 client-only state는 Zustand, access token은 memory, refresh token은 SecureStore가 단독 소유한다. |
| D-031 | ACCEPTED | 신뢰·module·데이터·상태 소유권 경계는 Milestone 0~1에 먼저 고정하고 내부 구현은 vertical slice마다 점진적으로 refactor한다. 구조 변경은 ADR 없이 전체 개발 후로 미루지 않는다. |
| D-032 | ACCEPTED | PostgreSQL 접근과 migration은 Drizzle ORM/Kit을 사용한다. SQL migration을 review하고 history table을 `finapp_` 이름으로 명시한다. |
| D-033 | ACCEPTED | backend unit/module/integration test runner는 NestJS 신규 프로젝트 기본값인 Vitest를 사용한다. PostgreSQL integration은 Testcontainers for Node.js를 사용한다. |
| D-034 | ACCEPTED | NestJS HTTP provider는 `@nestjs/platform-fastify`의 Fastify adapter를 사용하며 Express 전용 middleware를 혼용하지 않는다. |
| D-035 | ACCEPTED | OAuth2/OIDC access token은 Nest guard 뒤의 `jose` adapter가 remote JWKS, issuer, audience와 시간 claim을 검증한다. 암호 검증 코드를 직접 구현하거나 controller에서 token을 파싱하지 않는다. |
| D-036 | ACCEPTED | frontend와 backend Codex session은 별도 Git worktree/branch와 `FE-####`/`BE-####` 추적 ID를 사용한다. backend session을 기본 integration owner로 두고 shared file, root lockfile과 main merge를 직렬 처리한다. |
| D-037 | ACCEPTED | backend가 canonical OpenAPI artifact를 소유하고 frontend mock/API client는 특정 contract commit revision을 사용한다. mock payload는 schema validation과 deterministic dataset 기준을 통과해야 한다. |
| D-038 | ACCEPTED | frontend는 원격 DB에 연결하지 않는다. 원격 Lightsail migration은 backend의 단일 migration owner만 승인 후 수행하며 자동 test는 local/Testcontainers PostgreSQL을 사용한다. 합성 데이터는 destructive DB 작업의 허가 근거가 아니다. |
| D-039 | ACCEPTED | 공통 scaffold는 NodeNext ESM과 TypeScript 6.0.3을 사용한다. TypeScript 7.0.2는 현재 typescript-eslint 8.69.0의 `<6.1.0` peer 범위를 벗어나므로 사용하지 않는다. |
| D-040 | ACCEPTED | `contracts/openapi/platform-v1.yaml`과 simulator 계약을 canonical baseline으로 commit하고 Redocly lint와 JSON Schema fixture validation을 CI gate로 사용한다. |
| D-041 | ACCEPTED | DEV-0006 이후 frontend/backend 병렬 worktree 단계는 종료하고 모든 신규 개발과 통합 책임을 단일 `main` 작업 흐름으로 전환한다. 기존 `codex/frontend`와 `codex/backend`는 원격에 보존한다. |
| D-042 | ACCEPTED | mobile import boundary와 두 backend dependency-cruiser 검사를 root `verify`와 CI의 필수 gate로 실행한다. |
| D-043 | ACCEPTED | npm install script는 version-pinned allow/deny policy로 관리한다. Docker build context는 `.dockerignore`로 제한하고 backend image build는 해당 workspace와 root build tool만 clean install한다. |
| D-044 | ACCEPTED | DEV-0007 이후 `INTEGRATED_DEVELOPMENT_PLAN.md`를 단일 `main`의 활성 실행 순서로 사용한다. 기존 분리 branch는 이력으로 보존하고 FE/BE ID와 lane log는 영역별 추적을 위해 main에서도 유지한다. |

## 정정 이력

- 2026-09-01 / DEV-0003: 사용자가 backend 기술 기준을 Node.js + TypeScript, NestJS/Fastify, PostgreSQL, Vitest/Jest, OAuth2/OIDC와 Lightsail로 정정했다. 기존 Java/Spring Boot/Gradle/Flyway 결정은 구현 전에 폐기하고 D-002, D-003, D-015, D-024, D-026, D-028을 현재 내용으로 대체했다.

## 버전 기준

| 구성요소 | 기준 | 고정 방식 |
|---|---|---|
| Node.js | 24 LTS | `.nvmrc`, `engines`, CI와 container image |
| npm | lockfile과 함께 사용 | `package-lock.json` |
| TypeScript | 6.0.3 | exact root devDependency와 lockfile |
| NestJS | 12.0.1 | exact workspace dependency와 lockfile |
| Fastify | 5.12.1 | `@nestjs/platform-fastify` 12.0.1 dependency |
| Drizzle ORM/Kit | 0.45.2 / 0.31.10 | exact dependency와 lockfile |
| Vitest | 4.1.11 | exact root devDependency와 lockfile |
| jose | scaffold 시 current stable | exact dependency와 lockfile |
| Expo | 57.0.18 | workspace compatible range와 lockfile |
| React | 19.2.3 | Expo SDK 57 template와 root override |
| React Native | 0.86.3 | Expo SDK 57 template와 lockfile |
| Reanimated/Worklets | 4.5.1 / 0.10.1 | Expo SDK 57 template와 root override |
| Keycloak | 26.7.3 | container tag와 가능하면 digest |
| PostgreSQL | 17 major | container patch/digest는 scaffold 시 고정 |

## 로컬 환경 확인 결과

2026-09-01 기준:

- Node.js: `v24.19.0` — Node 24 LTS 기준 충족
- npm: `11.17.0`
- Docker: `29.5.2`

## Milestone 전에 확정할 항목

### Milestone 1 — 확정 완료

- Victory Native 42.0.0, Skia 2.6.2, Reanimated 4.5.1, Worklets 0.10.1
- PostgreSQL 17.6 Alpine digest와 Keycloak 26.7.3 digest
- Drizzle ORM 0.45.2 / Kit 0.31.10
- local ports: platform 8081, simulator 8082, Keycloak 8083, PostgreSQL 5433

### Milestone 2

- Keycloak realm: `finapp`
- mobile client ID: `finapp-mobile`
- API audience: `finapp-platform-api`
- access/refresh token TTL
- redirect URI: `wealthsandbox://oauth/callback`

### Milestone 6

- Lightsail PostgreSQL engine/version, endpoint, database/schema 생성 권한
- 전용 DB role 생성 권한
- TLS CA와 `verify-full` 가능 여부
- Lightsail instance CPU/memory
- Keycloak 원격 유지 또는 관리형 IdP 변경
- AWS region, KMS key policy, 배포 domain
- Apple/Google signing credential 사용 가능 여부

## 공식 호환성 근거

- Expo SDK: `https://docs.expo.dev/versions/latest/`
- Reanimated compatibility: `https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/`
- Node.js releases: `https://nodejs.org/en/about/previous-releases`
- NestJS modules/Fastify/testing: `https://docs.nestjs.com/modules`, `https://docs.nestjs.com/techniques/performance`, `https://docs.nestjs.com/fundamentals/testing`
- Drizzle schema/migrations: `https://orm.drizzle.team/docs/sql-schema-declaration`, `https://orm.drizzle.team/docs/drizzle-config-file#migrations`
- NestJS package metadata/jose: `https://www.npmjs.com/package/@nestjs/core`, `https://github.com/panva/jose`
- Keycloak Docker: `https://www.keycloak.org/getting-started/getting-started-docker`
