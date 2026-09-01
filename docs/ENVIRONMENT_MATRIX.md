# 환경 Matrix

- 상태: 실행 기준선
- 작성일: 2026-09-01

## 환경 구분

| 항목 | local | test | demo | production |
|---|---|---|---|---|
| 목적 | 개발자 로컬 실행 | 자동 테스트 | 포트폴리오 원격 시연 | 일반 공개를 가정한 안전 설정 검증 |
| PostgreSQL | Docker Compose | Testcontainers | Lightsail 전용 DB/schema | 별도 승인 전 미사용 |
| Keycloak | Docker `start-dev` | container/fixture | production mode container | 별도 승인 전 미사용 |
| simulator | local container | actual test container | private container network | 외부 노출 금지 |
| KMS | local provider | deterministic test provider | AWS KMS | AWS KMS |
| dev scenario API | 활성 | test fixture | `scenario.admin` 필요 | bean 미등록, 404 |
| synthetic reset | 활성 | test setup | admin만 허용 | 비활성 |
| HTTPS | 선택 | 불필요 | 필수 | 필수 |
| logging | 개발 친화, token redaction | 캡처/검증 | structured JSON | structured JSON |
| seed | `BALANCED_WORKER` | fixture별 | 고정 demo seed | 사용하지 않음 |

## Spring profile

- `local`: Compose dependency와 local crypto provider
- `test`: Testcontainers, fixed Clock, deterministic key provider
- `demo`: remote PostgreSQL, AWS KMS, dev scenario endpoint를 admin scope로 제한
- `production`: AWS KMS, dev/reset endpoint bean 미등록, 엄격한 CORS와 HTTPS

`demo`를 `production`처럼 표현하지 않는다. 개발자 장애 시나리오를 사용한 시연 환경임을 문서화한다.

## 기본 로컬 port

| 구성요소 | Host port | Container/internal port |
|---|---:|---:|
| platform-api | 8081 | 8080 |
| institution-simulator | 8082 | 8080 |
| Keycloak | 8083 | 8080 |
| PostgreSQL | 5433 | 5432 |
| Nginx | 8443 | 443 |

실제 scaffold 전 port 사용 여부를 검사한다. 충돌 시 이 문서와 `.env.example`을 함께 변경한다.

## 공개 설정과 비밀정보

### 모바일에 포함 가능한 값

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_OIDC_ISSUER`
- `EXPO_PUBLIC_OIDC_CLIENT_ID`
- `EXPO_PUBLIC_OIDC_AUDIENCE`
- `EXPO_PUBLIC_APP_SCHEME`
- synthetic dataset version

`EXPO_PUBLIC_*`에는 secret을 넣지 않는다.

### 서버 비밀정보

- `PLATFORM_DB_PASSWORD`
- `SIMULATOR_DB_PASSWORD`
- `KEYCLOAK_DB_PASSWORD`
- `KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD`
- AWS credential 또는 workload identity 설정
- KMS key policy 관련 값

실제 값은 `.env.local`, CI secret, 배포 secret store에서만 제공한다.

## 원격 배포 전 확인표

- [ ] database 또는 전용 schema 생성 가능
- [ ] 모든 애플리케이션 소유 DB 객체가 `finapp_` prefix를 사용하는지 catalog query로 확인
- [ ] Keycloak은 별도 `finapp_keycloak` database 또는 schema에만 존재
- [ ] platform/simulator/keycloak role 분리 가능
- [ ] 기존 schema에 권한 없음 확인
- [ ] backup/snapshot 절차 확인
- [ ] PostgreSQL engine과 Flyway migration 호환 확인
- [ ] TLS CA와 hostname verification 확인
- [ ] Keycloak memory/CPU 측정
- [ ] simulator route가 public reverse proxy에 없음
- [ ] KMS 최소 권한 policy 확인
- [ ] rollback image와 migration 복구 절차 작성
