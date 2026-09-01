# ADR-0001: 시스템 경계와 저장소 구조

- 상태: Accepted
- 날짜: 2026-09-01

## Context

프로젝트에는 사용자 모바일 앱, 플랫폼 도메인, 외부 금융기관 역할의 simulator가 있다. 일반적인 `front/backend` 구조는 플랫폼 backend와 외부기관 simulator의 신뢰 경계를 숨긴다.

## Decision

- 모바일은 `apps/mobile`에 둔다.
- 플랫폼 API는 `services/platform-api`에 둔다.
- 금융기관 simulator는 `services/institution-simulator`에 둔다.
- 두 backend 서비스는 npm workspaces에서 dependency version과 lint/build convention을 공유할 수 있다.
- domain type, Drizzle schema, repository 구현과 database migration은 공유하지 않는다.
- API 계약 DTO는 OpenAPI로 관리하며 내부 domain class를 공유 계약으로 사용하지 않는다.
- simulator는 별도 process, container, DB login role로 실행한다.

## Consequences

- 서비스 경계와 배포 단위가 명확해진다.
- root `package.json`과 lockfile에서 dependency version과 공통 명령을 관리할 수 있다.
- 일부 DTO 중복이 생기지만 외부기관 경계를 보여주기 위해 허용한다.
- platform이 simulator DB를 직접 조회하는 구현은 아키텍처 위반이다.
