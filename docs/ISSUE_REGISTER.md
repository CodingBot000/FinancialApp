# 이슈와 누락 Register

- 마지막 갱신: 2026-09-02
- 다음 ISSUE ID: `ISSUE-0004`
- 다음 GAP ID: `GAP-0004`

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
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0005
- 영향 Milestone: 1 frontend dependency, 6 preview/demo release
- 내용: frontend/backend 통합 lockfile에서 `npm audit`이 Expo SDK 57, Expo Router, Expo Splash Screen과 관련 전이 dependency 경로의 moderate advisory 14건을 보고한다.
- 영향: local scaffold, contract mock, typecheck, test와 build는 성공한다. 그러나 원격 preview/demo release 전에 upstream patch 또는 안전한 override 가능 여부를 다시 확인해야 한다.
- 임시 우회: 공식 Expo SDK 57 template 조합을 exact/compatible range로 고정하고 `npm audit fix --force`를 실행하지 않는다. 실제 개인정보를 사용하지 않고 untrusted deep-link 입력 처리는 frontend security test에 포함한다.
- 해결 조건: Expo SDK 57 호환 patch로 advisory가 해소되거나, 공식 호환성이 확인된 override 후 Expo Doctor·native build·전체 test를 통과하거나, 사용자가 잔여 위험을 명시적으로 수용한다.
- 목표 DEV: 늦어도 Milestone 6 release gate 전 해결
- 해결 DEV:
- 검증: DEV-0006 통합 `npm audit --json`에서 Expo 관련 moderate 14건을 확인했다. 자동 fix는 Expo 46, Expo Router 5 또는 다른 비호환 조합을 제안하므로 적용하지 않았다. 전체 통합 결과는 Drizzle 관련 4건을 포함해 moderate 18, high 0, critical 0이다.

### ISSUE-0003 — Drizzle Kit build-time transitive advisory

- 상태: OPEN
- 심각도: MEDIUM
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-02
- 발견 DEV: `BE-0001`, 중앙 연결 `DEV-0006`
- 영향 Milestone: 1 migration toolchain, 6 release gate
- 내용: stable `drizzle-kit@0.31.10`이 advisory 대상 `@esbuild-kit/*`와 `esbuild` 경로를 build-time dependency로 포함해 moderate 4건을 만든다.
- 영향: schema generation과 migration 개발 도구에만 존재한다. platform/simulator production image의 workspace-scoped runtime audit은 각각 0이다.
- 임시 우회: exact version을 lock하고 production image에서 devDependency를 제외한다. beta downgrade/upgrade나 전역 esbuild override를 강제하지 않는다.
- 해결 조건: 안전한 stable Drizzle Kit 갱신 후 schema generation, migration, Testcontainers, lint, typecheck와 build가 모두 통과한다.
- 목표 DEV: 늦어도 Milestone 6 release gate 전 해결
- 해결 DEV:
- 검증: DEV-0006 통합 `npm audit --json`에서 Drizzle 관련 moderate 4건, production image runtime vulnerability 0을 확인했다.

## Active Gap

### GAP-0001 — live OIDC와 native session restart 검증

- 상태: UNVERIFIED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: `FE-0005`, 중앙 연결 `DEV-0006`
- 원래 요구사항: 실제 OIDC Authorization Code + PKCE 로그인, refresh rotation, `/api/v1/me`와 SecureStore process restart 검증
- 누락/연기 이유: adapter, backend resource server, local Keycloak와 redirect는 준비됐지만 합성 login user와 native end-to-end 실행을 아직 통합하지 않았다.
- 현재 영향: Milestone 2의 live 완료 판정만 보류하며 unit/component/backend E2E와 이후 contract 개발은 가능하다.
- 목표 Milestone: 2 / FE-0010
- 재확인 조건: local Keycloak login→callback→`/me`→process restart refresh→logout을 native build에서 통과
- 해결 DEV:
- 검증: DEV-0006에서 Keycloak discovery, `finapp-mobile` public client, `wealthsandbox://oauth/callback`과 무인증 `/me` 401 계약을 확인했다.

### GAP-0002 — iOS Development Build runtime 검증

- 상태: UNVERIFIED
- 심각도: LOW
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: `FE-0004`, 중앙 연결 `DEV-0006`
- 원래 요구사항: iOS에서 chart, SecureStore, AuthSession과 LocalAuthentication runtime smoke
- 누락/연기 이유: 현재 호스트 Xcode 16.2가 Expo SDK 57의 iOS toolchain 요구를 충족하지 않는다.
- 현재 영향: Android build/runtime과 iOS bundle은 검증됐으나 iOS preview/release gate는 미완료다.
- 목표 Milestone: 6 이전
- 재확인 조건: 지원 Xcode/iOS Simulator 또는 실제 iOS 기기에서 clean Development Build smoke 통과
- 해결 DEV:
- 검증: frontend `FE-GAP-0002` 참조

### GAP-0003 — 실제 기기 biometric/background App Lock 검증

- 상태: UNVERIFIED
- 심각도: LOW
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: `FE-0006`, 중앙 연결 `DEV-0006`
- 원래 요구사항: 실제 Face ID/Touch ID/Android biometric의 성공·취소·lockout과 background timeout 검증
- 누락/연기 이유: native autolinking/build와 자동 테스트는 통과했지만 등록된 실제 biometric 기기를 사용하지 않았다.
- 현재 영향: Milestone 2 실기기 완료 판정만 보류한다.
- 목표 Milestone: 6 이전
- 재확인 조건: 지원 실제 기기에서 prompt, cancel, lockout, background 60초와 재인증 흐름 통과
- 해결 DEV:
- 검증: frontend `FE-GAP-0004` 참조

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
