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
- 마지막 갱신: 2026-09-01, FE-0001
- 관련 contract revision: `platform-v1`
- 중앙 연결: `ISSUE-0002`
- 내용: 공식 Expo SDK 57.0.18 dependency tree에서 `npm audit` moderate 13건이 보고된다.
- 영향: local 개발과 자동 검증은 통과하지만 preview/demo release 전에 upstream patch 또는 공식 호환 override를 확인해야 한다.
- 해결 조건: 중앙 `ISSUE-0002`의 해결 조건 충족
- 목표 FE: Milestone 6 preview/demo release gate 전 호환 patch 상태 재확인
- 해결 FE:
- 검증: FE-0001에서 `npm view expo@57 version --json`과 Expo 공식 SDK 57 문서를 확인한 결과 stable 최신 patch는 `57.0.18`이며 현재 manifest와 동일하다. `expo install --check`는 통과했다. `npm audit --json`은 moderate 13/high 0/critical 0으로 DEV-0005와 동일하고 제안된 강제 fix는 Expo 46 또는 Expo Router 5로의 비호환 downgrade다. Expo Doctor와 native Development Build는 후속 Milestone 1 검증에 포함한다.

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
