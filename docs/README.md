# 개발 문서 안내

이 디렉터리는 `Wealth Sandbox` 구현의 기준 문서를 보관한다.

## Codex가 읽을 순서

1. `MVP_SCOPE.md` — 이번 단계에서 만들 것과 만들지 않을 것
2. `INTEGRATED_DEVELOPMENT_PLAN.md` — DEV-0007 이후 단일 `main`의 활성 작업 순서와 완료 조건
3. `IMPLEMENTATION_STATUS.md` — 현재 상태와 바로 다음 작업
4. `ISSUE_REGISTER.md` — 현재 blocker, issue, deferred gap
5. `DEVELOPMENT_LOG.md` — 통합 commit 단위 작업과 다음 DEV ID
6. 해당 영역의 `workstreams/<lane>/DEVELOPMENT_LOG.md`, `ISSUE_REGISTER.md` — FE/BE ID와 영역별 추적
7. `IMPLEMENTATION_DECISIONS.md` — 확정 기술과 미결정 외부 조건
8. `ARCHITECTURE_GUIDE.md` — 앱·서버 구조, 의존성 방향과 자동 품질 gate
9. 현재 작업에 해당하는 계약 문서
   - `API_CONTRACTS.md`
   - `DATA_MODEL.md`
   - `TABLE_DEFINITIONS.md`
   - `SECURITY_MODEL.md`
   - `TEST_STRATEGY.md`
   - `ENVIRONMENT_MATRIX.md`
10. 관련 `adr/ADR-*.md`
11. `CODEX_IMPLEMENTATION_PLAN.md` — 최초 milestone과 병렬 개발 전 실행 기준선
12. `PARALLEL_DEVELOPMENT_GUIDE.md` — 종료된 분리 개발 이력과 향후 재분리 기준
13. `Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md` — 최종 포트폴리오 배경과 장기 요구사항

## 문서 우선순위

충돌 시 다음 순서를 따른다.

```text
MVP_SCOPE
  > IMPLEMENTATION_DECISIONS / ADR
  > ARCHITECTURE / API / DATA / SECURITY / TEST 계약
  > INTEGRATED_DEVELOPMENT_PLAN
  > PARALLEL_DEVELOPMENT_GUIDE
  > CODEX_IMPLEMENTATION_PLAN
  > 원본 상세 명세
```

## 변경 규칙

- scope 변경은 `MVP_SCOPE.md`에 먼저 반영한다.
- 구조 또는 기술 선택 변경은 ADR이나 `IMPLEMENTATION_DECISIONS.md`에 이유를 기록한다.
- 앱·서버 코드는 `ARCHITECTURE_GUIDE.md`의 module, dependency와 상태 소유권 규칙을 따르며 CI에서 자동 검증한다.
- DEV-0007 이후 신규 개발은 `INTEGRATED_DEVELOPMENT_PLAN.md`에 따라 단일 `main`에서 직렬 진행한다.
- 기존 분리 branch/worktree는 이력으로 보존하며 재분리를 명시적으로 결정할 때만 `PARALLEL_DEVELOPMENT_GUIDE.md`를 다시 적용한다.
- API와 DB 변경은 계약 문서와 구현을 같은 변경에서 갱신한다.
- 모든 애플리케이션 소유 테이블과 DB 객체는 `TABLE_DEFINITIONS.md`의 `finapp_` prefix 규칙을 따른다.
- 작업 완료 여부는 테스트 결과를 확인한 후 `IMPLEMENTATION_STATUS.md`에 기록한다.
- 통합 commit은 `DEV-####`, frontend는 `FE-####`, backend는 `BE-####`와 대응하는 개발 로그 항목을 포함한다.
- 발견된 문제와 누락은 `ISSUE_REGISTER.md`에 등록하며 해결 후에도 삭제하지 않는다.
- 외부 blocker가 발생하면 문서에 재개 조건을 남기고 진행 가능한 다른 작업을 계속한다.
- 원본 상세 명세는 배경 기준선이므로 직접 축약하거나 삭제하지 않는다.
