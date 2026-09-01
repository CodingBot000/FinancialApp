.PHONY: bootstrap build contract-check format format-check lint test typecheck verify

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

typecheck:
	npm run typecheck

verify:
	npm run verify
