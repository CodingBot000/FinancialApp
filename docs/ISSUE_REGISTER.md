# 이슈와 누락 Register

- 마지막 갱신: 2026-09-01
- 다음 ISSUE ID: `ISSUE-0003`
- 다음 GAP ID: `GAP-0001`

이 문서는 defect, blocker, 위험과 불가피한 누락을 삭제하지 않고 추적한다.

frontend 내부 항목은 `workstreams/frontend/ISSUE_REGISTER.md`의 `FE-ISSUE-####`/`FE-GAP-####`, backend 내부 항목은 `workstreams/backend/ISSUE_REGISTER.md`의 `BE-ISSUE-####`/`BE-GAP-####`를 사용한다. 두 영역 또는 milestone 완료에 영향을 주는 항목만 integration owner가 이 중앙 register의 `ISSUE-####`/`GAP-####`에 연결한다.

## 상태

- `OPEN`: 해결 작업이 필요함
- `IN_PROGRESS`: 현재 해결 중
- `BLOCKED`: 외부 입력이나 상태가 필요함
- `DEFERRED`: 이유와 목표 milestone을 정해 연기함
- `UNVERIFIED`: 구현했지만 필요한 환경에서 검증하지 못함
- `RESOLVED`: 수정과 검증 완료
- `ACCEPTED_RISK`: 사용자가 잔여 위험을 명시적으로 수용함

## Active Issue

### ISSUE-0002 — Expo 57 transitive dependency moderate advisory

- 상태: OPEN
- 심각도: MEDIUM
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-01
- 발견 DEV: DEV-0005
- 영향 Milestone: 1 frontend dependency, 6 preview/demo release
- 내용: 공식 Expo SDK 57.0.18 dependency tree에 대해 `npm audit`이 `expo`, `expo-router`, `query-string`, `decode-uri-component`, `xcode`와 `uuid` 경로의 moderate advisory 13건을 보고한다.
- 영향: local scaffold, contract mock, typecheck, test와 build는 성공한다. 그러나 원격 preview/demo release 전에 upstream patch 또는 안전한 override 가능 여부를 다시 확인해야 한다.
- 임시 우회: 공식 Expo SDK 57 template 조합을 exact/compatible range로 고정하고 `npm audit fix --force`를 실행하지 않는다. 실제 개인정보를 사용하지 않고 untrusted deep-link 입력 처리는 frontend security test에 포함한다.
- 해결 조건: Expo SDK 57 호환 patch로 advisory가 해소되거나, 공식 호환성이 확인된 override 후 Expo Doctor·native build·전체 test를 통과하거나, 사용자가 잔여 위험을 명시적으로 수용한다.
- 목표 DEV: `FE-0001`에서 최신 upstream 상태 재확인, 늦어도 Milestone 6 release gate 전 해결
- 해결 DEV:
- 검증: `npm audit --json`은 moderate 13, high 0, critical 0을 보고한다. 자동 fix 제안은 Expo 46.0.21과 Expo Router 5.1.11로의 비호환 major downgrade이므로 적용하지 않았다.

## Active Gap

현재 등록된 gap 없음.

## Resolved History

### ISSUE-0001 — 로컬 Java 21 미준비

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-01
- 발견 DEV: DEV-0001
- 원래 영향 Milestone: 0, 1~5 backend 개발
- 원래 내용: 최초 문서가 Java 21/Spring Boot backend를 잘못 전제했고 로컬 Java는 17이었다.
- 해결 DEV: DEV-0003
- 해결 내용: 사용자가 backend 기술을 Node.js + TypeScript와 NestJS/Fastify로 정정했다. Java toolchain 요구를 폐기하고 로컬 Node.js 24 LTS 환경을 기준으로 변경했다.
- 검증: `node --version`은 `v24.19.0`, `npm --version`은 `11.17.0`이며 Node.js 24는 2026-09-01 기준 LTS다.

## 새 Issue Template

```markdown
### ISSUE-#### — 제목

- 상태: OPEN
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 최초 발견: YYYY-MM-DD
- 마지막 갱신: YYYY-MM-DD
- 발견 DEV: DEV-####
- 영향 Milestone:
- 내용:
- 영향:
- 임시 우회:
- 해결 조건:
- 목표 DEV:
- 해결 DEV:
- 검증:
```
## 새 Gap Template

```markdown
### GAP-#### — 제목

- 상태: DEFERRED | UNVERIFIED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 최초 발견: YYYY-MM-DD
- 마지막 갱신: YYYY-MM-DD
- 발견 DEV: DEV-####
- 원래 요구사항:
- 누락/연기 이유:
- 현재 영향:
- 목표 Milestone:
- 재확인 조건:
- 해결 DEV:
- 검증:
```
