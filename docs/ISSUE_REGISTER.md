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

### ISSUE-0001 — 로컬 Java 21 미준비

- 상태: OPEN
- 심각도: HIGH
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-01
- 발견 DEV: DEV-0001
- 영향 Milestone: 0, 1~5 backend 개발
- 내용: 현재 로컬 `java -version`은 `17.0.20.1`이며 프로젝트 기준은 Java 21이다.
- 영향: Java 21 toolchain을 준비하기 전 backend scaffold와 최종 build 검증을 완료할 수 없다.
- 임시 우회: 문서 작업과 Java에 독립적인 저장소 준비는 계속할 수 있다.
- 해결 조건: Java 21 설치 또는 Gradle toolchain provisioning 후 `java -version`과 빈 Gradle build 성공 확인.
- 목표 DEV: DEV-0003

## Active Gap

현재 등록된 gap 없음.

## Resolved History

현재 해결 이력 없음.

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
