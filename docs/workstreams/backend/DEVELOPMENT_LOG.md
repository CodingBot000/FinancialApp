# Backend Workstream 개발 로그

- 기록 방식: append-only
- 다음 ID: `BE-0001`
- branch/worktree: session 시작 시 기록
- base commit: session 시작 시 기록
- contract revision: scaffold 이후 기록
- migration owner: backend session 또는 integration owner가 작업마다 기록

backend session은 `services/**`, `infra/**`, OpenAPI와 migration 변경을 commit 단위로 기록한다. 중앙 `DEVELOPMENT_LOG.md`는 integration owner 역할로 통합할 때만 수정한다.

## 새 기록 Template

```markdown
## BE-#### — 제목

- 날짜: YYYY-MM-DD
- Milestone: N
- 상태: COMPLETED | BLOCKED | PARTIAL
- base commit:
- contract revision:
- migration owner:
- commit: `<type>(be): <summary> [BE-####]`

### 완료
- ...

### 변경 파일
- ...

### 검증
- 명령:
- 결과:

### 원격 DB
- 사용 여부:
- migration commit/dataset version:
- 결과:

### 이슈·누락·Handoff
- BE-ISSUE/BE-GAP/Handoff:

### 다음 작업
- BE-####:
```
