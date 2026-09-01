# 구현 상태

- 현재 Milestone: 0 — 저장소와 결정 기준선
- 전체 상태: IN_PROGRESS
- 마지막 갱신: 2026-09-01
- 마지막 DEV ID: DEV-0004
- 다음 DEV ID: DEV-0005

## 상태 표기

- `NOT_STARTED`: 시작하지 않음
- `IN_PROGRESS`: 구현 또는 검증 중
- `BLOCKED`: 외부 조건 없이는 진행 불가
- `DONE`: 완료 조건과 검증 통과

## Milestone 요약

| Milestone | 상태 | 완료 조건 요약 |
|---|---|---|
| 0. 저장소와 결정 기준선 | IN_PROGRESS | 문서, Node.js 24, 구조, 기본 명령 |
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
- [x] 앱·서버 권장 아키텍처와 자동 품질 gate 기준
- [x] frontend/backend 병렬 worktree, 소유권, contract와 통합 규칙
- [x] frontend/backend별 개발 로그와 issue/gap tracker

### 환경과 scaffold

- [x] 로컬 Node.js 24 LTS와 npm 실행 확인
- [ ] Node version/engines 파일
- [ ] `apps/mobile` scaffold
- [ ] root npm workspaces와 두 NestJS service scaffold
- [ ] `infra` 디렉터리와 Compose scaffold
- [ ] `.env.example`
- [ ] Makefile
- [ ] root README
- [ ] secret scan 기준

### Milestone 0 검증

- [ ] `git status`에 의도하지 않은 파일 없음
- [ ] TypeScript strict로 두 backend build 성공
- [ ] Expo dependency install 성공
- [x] 문서 참조 파일, code fence, trailing whitespace 검사 성공

## 외부 조건

다음은 Milestone 0~5 로컬 개발을 막지 않는다.

- Lightsail DB 정보: 미제공
- AWS KMS 권한: 미제공
- 배포 domain과 TLS: 미제공
- Apple Developer/Google Play credential: 미확인
- 실제 iOS/Android 생체인증 기기: 미확인

이 조건들은 local/contract mock 병렬 개발을 막지 않는다. Lightsail DB를 Milestone 6 전에 demo integration에 사용하려면 최초 원격 migration 전에 DB 정보와 명시적 승인을 확인한다. 나머지 배포 조건은 Milestone 6 시작 전에 확인한다. 실제 기기 생체인증은 Milestone 2 완료 보고에서 자동 테스트와 분리해 기록한다.

## Active Issue와 Gap

- 현재 active issue 없음 (`ISSUE-0001`은 backend 기술 기준 정정으로 `DEV-0003`에서 해소)
- 현재 등록된 `GAP` 없음

## 다음 작업

1. `DEV-0005`에서 root npm workspace, 디렉터리, 공통 lockfile과 OpenAPI/CI baseline을 직렬 scaffold
2. 통합 scaffold commit을 공통 base로 frontend/backend worktree와 branch 분리
3. frontend는 `FE-0001`, backend는 `BE-0001`부터 병렬 개발 시작
4. NestJS 12 + Fastify platform/simulator와 Expo SDK 57 실행 골격 완성
5. Drizzle migration baseline과 `finapp_` history 설정
6. dependency-cruiser/ESLint와 mobile import boundary 기본 gate 추가
7. Docker Compose에 PostgreSQL과 Keycloak 추가
8. Milestone 1 health vertical slice를 main에서 통합 검증
