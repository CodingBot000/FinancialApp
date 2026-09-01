# 개발 문서 안내

이 디렉터리는 `Wealth Sandbox` 구현의 기준 문서를 보관한다.

## Codex가 읽을 순서

1. `MVP_SCOPE.md` — 이번 단계에서 만들 것과 만들지 않을 것
2. `CODEX_IMPLEMENTATION_PLAN.md` — 구현 순서와 milestone 완료 조건
3. `PARALLEL_DEVELOPMENT_GUIDE.md` — 두 Codex session의 worktree, 소유권, 계약과 통합 규칙
4. `IMPLEMENTATION_STATUS.md` — 현재 상태와 바로 다음 작업
5. `ISSUE_REGISTER.md` — 현재 blocker, issue, deferred gap
6. `DEVELOPMENT_LOG.md` — 통합 commit 단위 작업과 다음 DEV ID
7. 자신의 `workstreams/<lane>/DEVELOPMENT_LOG.md`, `ISSUE_REGISTER.md` — FE/BE session-local 추적
8. `IMPLEMENTATION_DECISIONS.md` — 확정 기술과 미결정 외부 조건
9. `ARCHITECTURE_GUIDE.md` — 앱·서버 구조, 의존성 방향과 자동 품질 gate
10. 현재 작업에 해당하는 계약 문서
   - `API_CONTRACTS.md`
   - `DATA_MODEL.md`
   - `TABLE_DEFINITIONS.md`
   - `SECURITY_MODEL.md`
   - `TEST_STRATEGY.md`
   - `ENVIRONMENT_MATRIX.md`
11. 관련 `adr/ADR-*.md`
12. `Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md` — 최종 포트폴리오 배경과 장기 요구사항

## 문서 우선순위

충돌 시 다음 순서를 따른다.

```text
MVP_SCOPE
  > IMPLEMENTATION_DECISIONS / ADR
  > ARCHITECTURE / PARALLEL DEVELOPMENT / API / DATA / SECURITY / TEST 계약
  > CODEX_IMPLEMENTATION_PLAN
  > 원본 상세 명세
```

## 변경 규칙

- scope 변경은 `MVP_SCOPE.md`에 먼저 반영한다.
- 구조 또는 기술 선택 변경은 ADR이나 `IMPLEMENTATION_DECISIONS.md`에 이유를 기록한다.
- 앱·서버 코드는 `ARCHITECTURE_GUIDE.md`의 module, dependency와 상태 소유권 규칙을 따르며 CI에서 자동 검증한다.
- 두 Codex session은 `PARALLEL_DEVELOPMENT_GUIDE.md`의 별도 worktree, 파일 소유권과 integration owner 규칙을 따른다.
- API와 DB 변경은 계약 문서와 구현을 같은 변경에서 갱신한다.
- 모든 애플리케이션 소유 테이블과 DB 객체는 `TABLE_DEFINITIONS.md`의 `finapp_` prefix 규칙을 따른다.
- 작업 완료 여부는 테스트 결과를 확인한 후 `IMPLEMENTATION_STATUS.md`에 기록한다.
- 통합 commit은 `DEV-####`, frontend는 `FE-####`, backend는 `BE-####`와 대응하는 개발 로그 항목을 포함한다.
- 발견된 문제와 누락은 `ISSUE_REGISTER.md`에 등록하며 해결 후에도 삭제하지 않는다.
- 외부 blocker가 발생하면 문서에 재개 조건을 남기고 진행 가능한 다른 작업을 계속한다.
- 원본 상세 명세는 배경 기준선이므로 직접 축약하거나 삭제하지 않는다.
