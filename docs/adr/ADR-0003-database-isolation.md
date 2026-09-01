# ADR-0003: PostgreSQL schema와 role 격리

- 상태: Accepted
- 날짜: 2026-09-01

## Context

로컬과 초기 demo에서는 하나의 PostgreSQL instance를 사용하는 것이 단순하지만 platform, simulator, Keycloak의 데이터 신뢰 경계는 분리해야 한다. 원격 DB에는 기존 서비스 데이터가 있을 수 있다.

## Decision

- 논리 schema는 `identity`, `mydata_raw`, `wealth`, `simulation`, `trading`, `audit`, `crypto`, `simulator`를 기본으로 한다.
- login role은 `financial_platform_app`, `financial_simulator_app`, `financial_migration`, `financial_keycloak`로 분리한다.
- platform role은 `simulator` schema에 권한이 없다.
- simulator role은 platform schema에 권한이 없다.
- app role은 DDL 권한이 없다.
- audit event는 app role이 INSERT할 수 있지만 UPDATE/DELETE할 수 없다.
- raw payload는 immutable table에 저장하고 처리 결과와 오류는 별도 table에 저장한다.
- 원격 migration 전 backup, engine, TLS, database/schema와 role 권한을 확인한다.
- `Flyway clean`은 모든 profile에서 비활성화한다.

## Consequences

- local Compose 초기화에 role/schema bootstrap script가 필요하다.
- Testcontainers에서 role isolation test를 추가해야 한다.
- 하나의 물리 DB를 사용해도 simulator HTTP 경계와 권한 격리를 증명할 수 있다.
- 원격 환경을 확인하지 않은 상태에서는 migration을 실행할 수 없다.
