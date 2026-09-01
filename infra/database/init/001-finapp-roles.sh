#!/bin/sh
set -eu

psql --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set platform_password="$FINAPP_PLATFORM_DB_PASSWORD" \
  --set simulator_password="$FINAPP_SIMULATOR_DB_PASSWORD" \
  --set migration_password="$FINAPP_MIGRATION_DB_PASSWORD" \
  --set keycloak_password="$FINAPP_KEYCLOAK_DB_PASSWORD" <<'SQL'
CREATE ROLE financial_platform_app LOGIN PASSWORD :'platform_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE financial_simulator_app LOGIN PASSWORD :'simulator_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE financial_migration LOGIN PASSWORD :'migration_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE ROLE financial_keycloak LOGIN PASSWORD :'keycloak_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

GRANT CONNECT ON DATABASE financial_app TO financial_platform_app, financial_simulator_app;
GRANT CONNECT, CREATE ON DATABASE financial_app TO financial_migration;
CREATE DATABASE finapp_keycloak OWNER financial_keycloak;
REVOKE ALL ON DATABASE finapp_keycloak FROM PUBLIC;
GRANT CONNECT ON DATABASE finapp_keycloak TO financial_keycloak;
SQL
