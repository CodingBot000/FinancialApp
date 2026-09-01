# Wealth Sandbox

Synthetic financial data와 별도 금융기관 simulator를 사용하는 React Native·NestJS 포트폴리오 프로젝트다. 데이터는 합성이지만 인증, HTTP, PostgreSQL, transaction, migration과 배포 경계는 실제 구성으로 구현한다.

## Workspace

```text
apps/mobile                         Expo Router mobile app
services/platform-api              NestJS + Fastify platform API
services/institution-simulator     NestJS + Fastify institution simulator
contracts/openapi                  Canonical HTTP contracts
infra                              Local and Lightsail infrastructure
docs                               Scope, architecture and progress tracking
```

## Requirements

- Node.js 24.19.0
- npm 11.17.x
- Docker 29+ for later local infrastructure and integration tests

## Baseline commands

```bash
npm ci
npm run contract:check
npm run architecture:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

Mobile 개발 서버는 `npm run start -w @finapp/mobile`, backend 서비스는 각 workspace의 `start:dev` script로 실행한다.

## Fresh-clone local MVP acceptance

다음 경로는 원격 자원을 사용하지 않고 local/Testcontainers PostgreSQL과 Docker Compose의 합성 데이터만 사용한다.

```bash
git clone <repository-url> FinancialApp
cd FinancialApp
cp infra/docker/.env.example infra/docker/.env
cp apps/mobile/.env.example apps/mobile/.env
make acceptance-test
```

`make acceptance-test`는 clean 인수 명령이다. **`finapp_postgres_data`라는 로컬 합성 Compose volume을 삭제**한 뒤 아래를 순서대로 재현한다. 실제 개인정보·계좌정보나 원격 DB를 사용하지 말아야 한다.

1. clean `npm ci`와 root `npm run verify`
2. 두 production image build·runtime audit
3. PostgreSQL/Keycloak 기동, platform/simulator Drizzle migration
4. deterministic simulator seed 2회 멱등 실행
5. PKCE S256 login→JWT→`/me`→refresh restart→logout
6. sync→raw/processing→Dashboard API→simulation→BUY settlement
7. 동일 idempotency key replay 단일 주문과 UNKNOWN GET reconciliation
8. runtime DB role의 핵심 query plan/index·100ms local ceiling 검증

성공 시 마지막에 `{"acceptance":"passed","scenarioSteps":12,"remoteResourcesUsed":false}`가 출력된다. 보존된 local stack에서 smoke만 재실행할 때는 `make smoke-test`, 서비스를 정지할 때는 `make infra-down`을 사용한다.

## Root make commands

```text
make bootstrap          clean workspace install
make format             formatter write
make lint               all workspace lint
make typecheck          strict TypeScript check
make unit-test          mobile + DB 제외 backend tests
make integration-test   backend actual Testcontainers suites
make concurrency-test   DB migration/concurrency invariant suites
make mobile-test        mobile adapter/component tests
make backend-test       full backend tests
make infra-up           local image/migration/seed/services
make infra-down         local services stop; volume 보존
make seed               deterministic simulator seed
make reset-demo         local simulator scenario/data reset
make smoke-test         live OIDC + 12-step business smoke
make performance-test   runtime role actual PostgreSQL query-plan gate
make verify             complete code quality gate
make acceptance-test    destructive clean local acceptance
```

## Development workflow

frontend FE-0001~~FE-0009와 backend BE-0001~~BE-0008의 병렬 단계는 DEV-0006에서 main에 통합됐다. 이후 신규 개발은 main 한 곳에서 직렬 진행하되 FE/BE/DEV commit ID와 개발 로그를 유지한다. 현재 순서와 완료 조건은 `docs/INTEGRATED_DEVELOPMENT_PLAN.md`, 과거 소유권과 재분리 기준은 `docs/PARALLEL_DEVELOPMENT_GUIDE.md`를 따른다. frontend는 PostgreSQL에 직접 연결하지 않고 canonical OpenAPI와 backend HTTP API를 사용한다.

## Remote database

이번 연속 개발 실행에서는 Lightsail PostgreSQL 사전점검, 연결과 migration/seed를 진행하지 않으며 local hardening 완료 후 원격 단계 직전에 멈춘다. 자동 test는 local/Testcontainers DB를 사용한다. 장기 원격 단계가 별도로 재승인되더라도 shared DB에서 `drizzle-kit push`, destructive reset과 동시 migration은 실행하지 않으며 모든 application-owned DB 객체는 `finapp_` prefix를 사용한다.
