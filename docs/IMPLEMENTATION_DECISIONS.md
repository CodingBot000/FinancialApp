# 구현 결정 기록

- 상태: 실행 기준선
- 마지막 갱신: 2026-09-01

이 문서는 ADR보다 작은 구현 결정을 한곳에 기록한다. `PENDING` 항목은 해당 milestone 전에 해결해야 한다.

## 결정 목록

| ID | 상태 | 결정 |
|---|---|---|
| D-001 | ACCEPTED | 저장소는 `apps/mobile`, `services/platform-api`, `services/institution-simulator` 구조를 사용한다. |
| D-002 | ACCEPTED | backend 두 서비스는 Java 21, Spring Boot 3.5.16, Gradle Kotlin DSL을 사용한다. |
| D-003 | ACCEPTED | backend는 하나의 Gradle multi-project build지만 서비스 간 domain/entity/repository를 공유하지 않는다. |
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
| D-015 | ACCEPTED | MyData sync, reconciliation, outbox는 PostgreSQL job table과 Spring scheduler를 사용한다. Kafka를 사용하지 않는다. |
| D-016 | ACCEPTED | MVP 주문은 BUY market order와 full fill/reject/unknown만 지원한다. |
| D-017 | ACCEPTED | 주문 상태는 `CREATED`, `FUNDS_RESERVED`, `PENDING_SUBMISSION`, `UNKNOWN`, `FILLED`, `REJECTED`, `FAILED`만 사용한다. |
| D-018 | ACCEPTED | 주문 HTTP 호출은 DB transaction 밖에서 수행한다. |
| D-019 | ACCEPTED | 현금 동시성은 `SELECT FOR UPDATE` 기반 pessimistic lock으로 보호한다. |
| D-020 | ACCEPTED | idempotency unique key는 `(user_id, operation, idempotency_key)`이고 request hash 불일치 시 conflict를 반환한다. |
| D-021 | ACCEPTED | simulation은 monthly step, deterministic seed, 약 1,000 paths를 기본값으로 사용한다. |
| D-022 | ACCEPTED | 서버 응답 money/quantity는 JSON string decimal로 직렬화한다. |
| D-023 | ACCEPTED | 시간은 DB에서 UTC `timestamptz`, API에서 ISO-8601 UTC로 표현한다. |
| D-024 | ACCEPTED | 환경은 `local`, `test`, `demo`, `production`으로 구분한다. dev scenario endpoint는 demo에서만 scope로 보호하고 production에는 bean을 등록하지 않는다. |
| D-025 | ACCEPTED | 원격 DB migration, KMS, 배포는 사용자 승인과 환경정보 확인 전 실행하지 않는다. |
| D-026 | ACCEPTED | 모든 애플리케이션 소유 schema, table, index, constraint와 Flyway history table에 `finapp_` prefix를 사용한다. |
| D-027 | ACCEPTED | Keycloak vendor table은 rename하지 않고 별도 `finapp_keycloak` database를 우선 사용한다. 별도 database가 불가능한 경우 전용 `finapp_keycloak` schema와 role로 격리한다. |

## 버전 기준

| 구성요소 | 기준 | 고정 방식 |
|---|---|---|
| Node.js | 22.13 이상, Node 22 LTS 권장 | `.nvmrc`와 CI version |
| npm | lockfile과 함께 사용 | `package-lock.json` |
| Expo | SDK 57 stable | `package.json`과 lockfile |
| React Native | Expo SDK 57 기본값 0.86 | Expo 관리 |
| Reanimated | Expo SDK와 호환되는 4.x | `npx expo install` 후 lockfile |
| Java | 21 | toolchain과 CI |
| Spring Boot | 3.5.16 | Gradle plugin version |
| Gradle | 8 계열 | wrapper |
| Keycloak | 26.7.3 | container tag와 가능하면 digest |
| PostgreSQL | 17 major | container patch/digest는 scaffold 시 고정 |

## 로컬 환경 확인 결과

2026-09-01 기준:

- Node.js: `v24.19.0` — 최소 요구 충족, 프로젝트 기본 문서는 Node 22 LTS 사용
- npm: `11.17.0`
- Java: `17.0.20.1` — 요구 버전 미달, Milestone 0에서 Java 21 설치 또는 toolchain 제공 필요
- Docker: `29.7.2`

## Milestone 전에 확정할 항목

### Milestone 1

- Victory Native, Skia, Reanimated 정확한 patch 조합
- PostgreSQL 17 정확한 container patch/digest
- Gradle wrapper 정확한 버전
- 로컬 port 충돌 여부

### Milestone 2

- Keycloak realm 이름
- mobile client ID
- API audience
- access/refresh token TTL
- redirect URI의 iOS/Android scheme

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
- Spring Boot 3.5 requirements: `https://docs.spring.io/spring-boot/3.5/system-requirements.html`
- Keycloak Docker: `https://www.keycloak.org/getting-started/getting-started-docker`
