# 개발 로그

- 기록 방식: append-only
- 마지막 DEV ID: `DEV-0002`
- 다음 DEV ID: `DEV-0003`

모든 개발 commit은 하나의 `DEV-####`와 연결한다. commit subject에도 같은 ID를 넣어 Git history와 문서 기록을 상호 추적할 수 있게 한다.

기존 항목의 사실 오류를 수정할 때는 원문을 삭제하지 않고 `정정` 또는 `추가 기록`을 남긴다.

## DEV-0001 — 실행 문서와 지속 개발 통제 기준선

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `docs(m0): establish implementation tracking [DEV-0001]`

### 완료

- 원본 상세 명세를 실행 가능한 MVP와 milestone으로 축소
- API, 데이터, 보안, 테스트와 환경 계약 작성
- 시스템 경계, IdP, DB 격리, background job ADR 작성
- 지속 실행과 blocker 전환 규칙 추가
- vertical slice와 milestone 단위 atomic commit 규칙 추가
- 완료·이슈·누락의 상시 문서화 절차 추가
- `DEVELOPMENT_LOG.md`와 `ISSUE_REGISTER.md` 생성

### 변경 파일

- `docs/README.md`
- `docs/MVP_SCOPE.md`
- `docs/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/ISSUE_REGISTER.md`
- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY_MODEL.md`
- `docs/TEST_STRATEGY.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/adr/ADR-0001-system-boundaries.md`
- `docs/adr/ADR-0002-identity-provider.md`
- `docs/adr/ADR-0003-database-isolation.md`
- `docs/adr/ADR-0004-background-jobs.md`

### 검증

- 필수 문서 존재 확인: 통과
- Markdown code fence 균형 검사: 통과
- trailing whitespace 검사: 통과
- 기본 secret/private-key 패턴 검사: 통과
- 축소 명세의 SELL/PARTIAL/order 상태 충돌 검사: 통과

### 이슈와 누락

- `ISSUE-0001`: 로컬 Java 21 환경 준비 필요
- 등록된 `GAP` 없음

### 다음 작업

- `DEV-0002`: Java 21 사용 가능 여부 해결 및 저장소 scaffold 시작

## DEV-0002 — 공용 DB용 prefix와 물리 테이블 정의

- 날짜: 2026-09-01
- Milestone: 0
- 상태: COMPLETED
- 예정 commit: `docs(m0): define prefixed database tables [DEV-0002]`

### 완료

- 사용자 우선순위에 따라 Java 환경 작업 전에 DB naming 기준을 먼저 확정
- 모든 애플리케이션 소유 DB 객체에 `finapp_` prefix 강제
- platform/simulator Flyway history table 이름 분리
- Keycloak vendor table의 별도 database/schema 격리 정책 확정
- schema, table, column, PK/FK/index/check constraint를 포함한 물리 테이블 정의서 작성
- 데이터 모델, ADR, 환경 확인표와 구현 결정 동기화

### 변경 파일

- `docs/TABLE_DEFINITIONS.md`
- `docs/Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`
- `docs/DATA_MODEL.md`
- `docs/IMPLEMENTATION_DECISIONS.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/CODEX_IMPLEMENTATION_PLAN.md`
- `docs/README.md`
- `docs/adr/ADR-0003-database-isolation.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/ISSUE_REGISTER.md`

### 검증

- 모든 application-owned table 이름의 `finapp_` prefix 검사
- schema/table 이름과 logical data model 대응 검사
- Markdown code fence, trailing whitespace, staged diff 검사

### 이슈와 누락

- `ISSUE-0001`: Java 21 준비는 `DEV-0003`으로 이동
- Keycloak vendor table은 직접 prefix 변경 불가. 별도 `finapp_keycloak` database 우선, 불가 시 전용 schema로 격리

### 다음 작업

- `DEV-0003`: Java 21 사용 가능 여부 해결 및 저장소 scaffold 시작

## 새 기록 Template

```markdown
## DEV-#### — 제목

- 날짜: YYYY-MM-DD
- Milestone: N
- 상태: COMPLETED | BLOCKED | PARTIAL
- 예정 commit: `<type>(mN): <summary> [DEV-####]`

### 완료
- ...

### 변경 파일
- ...

### 검증
- 명령:
- 결과:

### 이슈와 누락
- ISSUE/GAP:

### 다음 작업
- DEV-####:
```
