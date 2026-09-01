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
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

Mobile 개발 서버는 `npm run start -w @finapp/mobile`, backend 서비스는 각 workspace의 `start:dev` script로 실행한다.

## Parallel development

공통 scaffold가 main에 통합된 뒤 frontend와 backend를 별도 Git worktree에서 진행한다. 소유권, commit ID와 원격 DB 규칙은 `docs/PARALLEL_DEVELOPMENT_GUIDE.md`를 따른다. frontend는 PostgreSQL에 직접 연결하지 않고 canonical OpenAPI revision에 맞춘 contract mock을 사용한다.

## Remote database

Lightsail PostgreSQL은 승인된 demo integration에만 사용한다. 자동 test는 local/Testcontainers DB를 사용하며 shared DB에서 `drizzle-kit push`, destructive reset과 동시 migration을 실행하지 않는다. 모든 application-owned DB 객체는 `finapp_` prefix를 사용한다.
