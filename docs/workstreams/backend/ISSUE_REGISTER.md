# Backend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `BE-ISSUE-0001`
- 다음 GAP ID: `BE-GAP-0001`
- active issue: 없음
- active gap: 없음

backend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. frontend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Issue Template

```markdown
### BE-ISSUE-#### — 제목

- 상태: OPEN | IN_PROGRESS | BLOCKED | RESOLVED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 발견 BE:
- 관련 contract/migration revision:
- 내용:
- 영향:
- 해결 조건:
- 목표 BE:
- 해결 BE:
- 검증:
```

## Gap Template

```markdown
### BE-GAP-#### — 제목

- 상태: DEFERRED | UNVERIFIED | RESOLVED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 발견 BE:
- 누락/연기 이유:
- 현재 영향:
- 목표 Milestone:
- 재확인 조건:
- 해결 BE:
- 검증:
```
