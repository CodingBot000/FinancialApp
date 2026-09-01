# 구현 상태

- 현재 Milestone: 0 — 저장소와 결정 기준선
- 전체 상태: IN_PROGRESS
- 마지막 갱신: 2026-09-01
- 마지막 DEV ID: DEV-0002
- 다음 DEV ID: DEV-0003

## 상태 표기

- `NOT_STARTED`: 시작하지 않음
- `IN_PROGRESS`: 구현 또는 검증 중
- `BLOCKED`: 외부 조건 없이는 진행 불가
- `DONE`: 완료 조건과 검증 통과

## Milestone 요약

| Milestone | 상태 | 완료 조건 요약 |
|---|---|---|
| 0. 저장소와 결정 기준선 | IN_PROGRESS | 문서, Java 21, 구조, 기본 명령 |
| 1. 실행 가능한 골격 | NOT_STARTED | Compose, 두 서비스, Expo, health, CI |
| 2. OIDC와 App Lock | NOT_STARTED | PKCE, JWT 검증, refresh, biometric |
| 3. 동기화와 Dashboard | NOT_STARTED | simulator HTTP, raw/derived, 자산 UI |
| 4. 서버 시뮬레이션 | NOT_STARTED | deterministic p10/p50/p90 |
| 5. BUY 주문과 복구 | NOT_STARTED | idempotency, reservation, reconciliation |
| 6. 하드닝과 원격 데모 | NOT_STARTED | KMS, Lightsail, HTTPS, EAS, demo |

## Milestone 0 체크리스트

### 문서

- [x] 개발 문서 안내와 읽기 순서
- [x] commit 단위 개발 로그
- [x] 이슈·누락 register
- [x] 실행 계획
- [x] MVP 범위
- [x] 구현 결정
- [x] 환경 matrix
- [x] API 계약 초안
- [x] 데이터 모델 초안
- [x] `finapp_` prefix 기반 물리 테이블 정의서
- [x] 보안 모델
- [x] 테스트 전략
- [x] 시스템 경계 ADR
- [x] IdP ADR
- [x] DB 격리 ADR
- [x] 비동기 작업 ADR

### 환경과 scaffold

- [ ] Java 21 설치 또는 Gradle toolchain provisioning 확인
- [ ] Node version 파일
- [ ] `apps/mobile` scaffold
- [ ] `services` Gradle multi-project scaffold
- [ ] `infra` 디렉터리와 Compose scaffold
- [ ] `.env.example`
- [ ] Makefile
- [ ] root README
- [ ] secret scan 기준

### Milestone 0 검증

- [ ] `git status`에 의도하지 않은 파일 없음
- [ ] Java 21로 빈 backend build 성공
- [ ] Expo dependency install 성공
- [x] 문서 참조 파일, code fence, trailing whitespace 검사 성공

## 외부 조건

다음은 Milestone 0~5 로컬 개발을 막지 않는다.

- Lightsail DB 정보: 미제공
- AWS KMS 권한: 미제공
- 배포 domain과 TLS: 미제공
- Apple Developer/Google Play credential: 미확인
- 실제 iOS/Android 생체인증 기기: 미확인

Milestone 6 시작 전에만 확인한다. 실제 기기 생체인증은 Milestone 2 완료 보고에서 자동 테스트와 분리해 기록한다.

## Active Issue와 Gap

- `ISSUE-0001`: 로컬 Java가 17이며 프로젝트 기준 Java 21이 준비되지 않음 (`DEV-0003`에서 처리 예정)
- 현재 등록된 `GAP` 없음

## 다음 작업

1. Java 21 사용 환경 준비
2. 문서 구조에 맞춘 디렉터리 scaffold
3. Gradle multi-project와 Expo SDK 57 프로젝트 생성
4. Docker Compose에 PostgreSQL과 Keycloak 추가
5. Milestone 1 health vertical slice 구현
