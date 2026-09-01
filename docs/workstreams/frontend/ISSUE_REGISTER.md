# Frontend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `FE-ISSUE-0002`
- 다음 GAP ID: `FE-GAP-0001`
- active issue: `FE-ISSUE-0001`
- active gap: 없음

frontend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. backend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Active Issue

### FE-ISSUE-0001 — Expo 57 transitive dependency advisory 재확인

- 상태: OPEN
- 심각도: MEDIUM
- 발견 FE: DEV-0005 공통 scaffold
- 관련 contract revision: `platform-v1`
- 중앙 연결: `ISSUE-0002`
- 내용: 공식 Expo SDK 57.0.18 dependency tree에서 `npm audit` moderate 13건이 보고된다.
- 영향: local 개발과 자동 검증은 통과하지만 preview/demo release 전에 upstream patch 또는 공식 호환 override를 확인해야 한다.
- 해결 조건: 중앙 `ISSUE-0002`의 해결 조건 충족
- 목표 FE: FE-0001에서 최신 Expo patch와 advisory 상태 재확인
- 해결 FE:
- 검증: `npm audit --json`, Expo Doctor와 native Development Build

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
