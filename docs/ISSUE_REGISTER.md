# 이슈와 누락 Register

- 마지막 갱신: 2026-09-01
- 다음 ISSUE ID: `ISSUE-0002`
- 다음 GAP ID: `GAP-0001`

이 문서는 defect, blocker, 위험과 불가피한 누락을 삭제하지 않고 추적한다.

## 상태

- `OPEN`: 해결 작업이 필요함
- `IN_PROGRESS`: 현재 해결 중
- `BLOCKED`: 외부 입력이나 상태가 필요함
- `DEFERRED`: 이유와 목표 milestone을 정해 연기함
- `UNVERIFIED`: 구현했지만 필요한 환경에서 검증하지 못함
- `RESOLVED`: 수정과 검증 완료
- `ACCEPTED_RISK`: 사용자가 잔여 위험을 명시적으로 수용함

## Active Issue

현재 active issue 없음.

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
