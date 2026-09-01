# Backend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `BE-ISSUE-0002`
- 다음 GAP ID: `BE-GAP-0001`
- active issue: `BE-ISSUE-0001`
- active gap: 없음

backend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. frontend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Active Issue

### BE-ISSUE-0001 — Drizzle Kit build-time transitive moderate advisory

- 상태: OPEN
- 심각도: MEDIUM
- 발견 BE: BE-0001
- 관련 contract/migration revision: `0000_finapp_platform_baseline`, `0000_finapp_simulator_baseline`
- 내용: current stable `drizzle-kit@0.31.10`이 더 이상 유지되지 않는 `@esbuild-kit/*`와 advisory 대상 `esbuild<=0.24.2`를 build-time dependency로 포함한다. root `npm audit`의 기존 Expo 13건에 4건이 추가되어 moderate 17, high/critical 0이다.
- 영향: Drizzle schema generation을 실행하는 개발/CI toolchain에만 존재한다. production image의 workspace-scoped `npm ci --omit=dev` 결과는 vulnerability 0이며 runtime에는 Drizzle Kit과 esbuild를 포함하지 않는다.
- 해결 조건: Drizzle Kit stable이 해당 dependency를 제거한 버전으로 갱신되고 migration generation/check, Testcontainers migration, lint, typecheck와 build가 모두 통과한다. 호환성 검증 없이 beta 강제 업그레이드 또는 전역 esbuild override를 적용하지 않는다.
- 목표 BE: Milestone 1 통합 전 upstream 재확인, 늦어도 Milestone 6 release gate 전 해결
- 해결 BE:
- 검증: `npm audit --json` moderate 17/high 0/critical 0. Docker runtime stage는 platform/simulator 각각 144 package, vulnerability 0을 보고했다.

## 단계별 검토 이력

- BE-0003 (2026-09-02): `BE-ISSUE-0001` 변화 없음. 신규 issue/gap 없음. clean PostgreSQL migration과 seed 2회, prefix/권한 catalog 검사, 전체 `npm run verify`, simulator runtime audit 0으로 확인했다.

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
