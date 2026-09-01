# Infrastructure

이 디렉터리는 backend workstream이 소유한다. 로컬 스택은 PostgreSQL 17.6,
Keycloak 26.7.3, platform-api와 institution-simulator를 별도 컨테이너로 실행한다.

## 로컬 실행

```bash
cp infra/docker/.env.example infra/docker/.env
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml up -d --build
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml --profile tools run --rm platform-migrate
docker compose --env-file infra/docker/.env -f infra/docker/compose.yaml --profile tools run --rm simulator-migrate
```

로컬 스택의 database bootstrap은 다음 경계를 만든다.

- `financial_migration`: `finapp_*` application schema의 DDL owner
- `financial_platform_app`: platform schema DML 전용, simulator schema 접근 불가
- `financial_simulator_app`: `finapp_simulator` DML 전용, platform schema 접근 불가
- `financial_keycloak`: 별도 `finapp_keycloak` database owner

`.env.example`의 password는 로컬 전용 공개 예시다. demo/remote 환경에 재사용하지
않는다. 원격 Lightsail 연결, migration과 seed는 사용자 승인 전에는 실행하지 않는다.

## 로컬 OIDC 합성 사용자와 Smoke

Keycloak과 platform-api가 준비된 뒤 합성 사용자 password를 source나 `.env.example`에
저장하지 않고 현재 shell에만 전달한다.

```bash
export FINAPP_LOCAL_OIDC_TEST_PASSWORD='<local synthetic password>'
export FINAPP_KEYCLOAK_ADMIN_PASSWORD='<infra/docker/.env의 local admin password>'
npm run oidc:local:user
npm run smoke:local-oidc
unset FINAPP_LOCAL_OIDC_TEST_PASSWORD FINAPP_KEYCLOAK_ADMIN_PASSWORD
```

`oidc:local:user`는 `finapp-mobile` public client에 Keycloak 25+ lightweight access
token용 `basic` subject scope와 optional `offline_access` scope를 멱등 적용하고, 실제
개인정보가 아닌 `.invalid` email의 `synthetic-investor`를 생성 또는 갱신한다.

`smoke:local-oidc`는 Authorization Code + PKCE S256, callback state, JWT
issuer/audience/subject/scope와 서명, 실제 `/api/v1/me`, refresh-only process restart,
invalid token fail-closed, logout 뒤 refresh token 폐기를 검증한다. token, password,
authorization code는 출력하지 않는다.
