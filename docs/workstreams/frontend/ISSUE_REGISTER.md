# Frontend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `FE-ISSUE-0001`
- 다음 GAP ID: `FE-GAP-0001`
- active issue: 없음
- active gap: 없음

frontend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. backend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Issue Template

```markdown
### FE-ISSUE-#### — 제목

- 상태: OPEN | IN_PROGRESS | BLOCKED | RESOLVED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 발견 FE:
- 관련 contract revision:
- 내용:
- 영향:
- 해결 조건:
- 목표 FE:
- 해결 FE:
- 검증:
```

## Gap Template

```markdown
### FE-GAP-#### — 제목

- 상태: DEFERRED | UNVERIFIED | RESOLVED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 발견 FE:
- 누락/연기 이유:
- 현재 영향:
- 목표 Milestone:
- 재확인 조건:
- 해결 FE:
- 검증:
```
