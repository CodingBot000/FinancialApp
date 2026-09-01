# Frontend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `FE-ISSUE-0002`
- 다음 GAP ID: `FE-GAP-0003`
- active issue: `FE-ISSUE-0001`
- active gap: `FE-GAP-0002`

frontend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. backend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Active Issue

### FE-ISSUE-0001 — Expo 57 transitive dependency advisory 재확인

- 상태: OPEN
- 심각도: MEDIUM
- 발견 FE: DEV-0005 공통 scaffold
- 마지막 갱신: 2026-09-02, FE-0004
- 관련 contract revision: `platform-v1`
- 중앙 연결: `ISSUE-0002`
- 내용: 공식 Expo SDK 57.0.18 dependency tree에서 `npm audit` moderate 13건이 보고된다.
- 영향: local 개발과 자동 검증은 통과하지만 preview/demo release 전에 upstream patch 또는 공식 호환 override를 확인해야 한다.
- 해결 조건: 중앙 `ISSUE-0002`의 해결 조건 충족
- 목표 FE: Milestone 6 preview/demo release gate 전 호환 patch 상태 재확인
- 해결 FE:
- 검증: FE-0001에서 `npm view expo@57 version --json`과 Expo 공식 SDK 57 문서를 확인한 결과 stable 최신 patch는 `57.0.18`이며 현재 manifest와 동일하다. FE-0004의 Skia/Victory/dev-client/splash 추가 후에도 `expo install --check`는 통과하고 `npm audit --json`은 moderate 13/high 0/critical 0으로 유지됐다. 제안된 강제 fix는 Expo 46 또는 Expo Router 5로의 비호환 downgrade다. Android API 31 Development Build와 chart runtime smoke는 FE-0004에서 통과했다.

## Active Gap

### FE-GAP-0002 — iOS Development Build chart runtime 검증

- 상태: UNVERIFIED
- 심각도: LOW
- 발견 FE: FE-0004
- 누락/연기 이유: 현재 호스트의 Xcode 16.2와 설치된 iOS 17.5~18.1 Simulator runtime으로는 Expo SDK 57의 최신 iOS native toolchain 요구를 충족할 수 없다. frontend 소유 범위를 벗어난 Xcode 업그레이드를 수행하지 않았다.
- 현재 영향: Android API 31 Development Build에서 Victory Native/Skia/Reanimated chart smoke가 성공해 Milestone 1의 최소 1개 플랫폼 완료 조건에는 영향이 없다. iOS preview/release confidence만 미검증 상태다.
- 목표 Milestone: 6 preview/demo release gate 전
- 재확인 조건: Expo SDK 57 지원 Xcode/iOS simulator 또는 실제 iOS 기기에서 clean Development Build, health screen chart 렌더링, fatal native/JS log 없음 확인
- 해결 FE:
- 검증: FE-0004에서 iOS Hermes production bundle 2,312 modules/4.9MB는 성공했다. Android에서는 x86_64 Debug APK build와 API 31 runtime chart render까지 성공했다.

## Resolved Gap History

### FE-GAP-0001 — React 19 mobile component test harness

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: FE-0002
- 누락/연기 이유: `react-test-renderer 19.2.3` 기반 smoke test는 deprecated 경고와 React act 환경 불일치를 발생시켜 기준선에서 제거했다. 경고를 숨기거나 deprecated renderer를 고정하지 않고 React Native Testing Library 14와 Vitest의 호환 설정을 검증해야 한다.
- 현재 영향: 없음. FE-0003에서 health loading/ready/error component test가 추가됐다.
- 목표 Milestone: 1
- 재확인 조건: React 19.2.3/React Native 0.86.3에서 경고 없이 실행되는 RNTL component suite와 lint/typecheck/web export 통과
- 해결 FE: FE-0003
- 검증: RNTL 14.0.1과 modern test-renderer 1.2.0, Vitest optimizer와 test-only RN host shim 조합에서 loading → ready와 retryable error/accessibility button component test 통과. 전체 mobile suite 7 files/16 tests, lint, strict typecheck와 web export 통과

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
