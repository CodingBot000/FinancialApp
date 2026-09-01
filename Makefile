COMPOSE_ENV_FILE ?= infra/docker/.env
COMPOSE = docker compose --env-file $(COMPOSE_ENV_FILE) -f infra/docker/compose.yaml

.PHONY: acceptance-test backend-test bootstrap build concurrency-test contract-check format format-check infra-down infra-up integration-test lint mobile-test reset-demo seed smoke-test test typecheck unit-test verify

bootstrap:
	npm ci

build:
	npm run build

contract-check:
	npm run contract:check

format:
	npm run format

format-check:
	npm run format:check

lint:
	npm run lint

test:
	npm run test

unit-test:
	npm run test -w @finapp/mobile
	npm run test -w @finapp/platform-api -- --exclude test/database/migration.integration.test.ts
	npm run test -w @finapp/institution-simulator -- --exclude test/database/migration.integration.test.ts

integration-test:
	node scripts/run-with-local-docker.mjs npm run test -w @finapp/platform-api
	node scripts/run-with-local-docker.mjs npm run test -w @finapp/institution-simulator

concurrency-test:
	node scripts/run-with-local-docker.mjs npm run test -w @finapp/platform-api -- test/database/migration.integration.test.ts
	node scripts/run-with-local-docker.mjs npm run test -w @finapp/institution-simulator -- test/database/migration.integration.test.ts

mobile-test:
	npm run test -w @finapp/mobile

backend-test:
	node scripts/run-with-local-docker.mjs npm run test -w @finapp/platform-api
	node scripts/run-with-local-docker.mjs npm run test -w @finapp/institution-simulator

infra-up:
	test -f $(COMPOSE_ENV_FILE)
	$(COMPOSE) build platform-api institution-simulator
	$(COMPOSE) up -d postgres keycloak
	$(COMPOSE) --profile tools run --rm platform-migrate
	$(COMPOSE) --profile tools run --rm simulator-migrate
	$(COMPOSE) --profile tools run --rm simulator-seed
	$(COMPOSE) up -d platform-api institution-simulator
	npm run wait:local-infra

infra-down:
	test -f $(COMPOSE_ENV_FILE)
	$(COMPOSE) down

seed:
	test -f $(COMPOSE_ENV_FILE)
	$(COMPOSE) --profile tools run --rm simulator-seed

reset-demo:
	npm run reset:local-demo

smoke-test:
	npm run build -w @finapp/platform-api
	COMPOSE_ENV_FILE=$(COMPOSE_ENV_FILE) npm run smoke:local-mvp

acceptance-test:
	COMPOSE_ENV_FILE=$(COMPOSE_ENV_FILE) npm run accept:local-mvp:clean

typecheck:
	npm run typecheck

verify:
	node scripts/run-with-local-docker.mjs npm run verify
