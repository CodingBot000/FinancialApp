# 개발 문서 안내

이 디렉터리는 기술 프로젝트 `Wealth Sandbox`와 모바일 사용자 노출 브랜드
`Wealth Flow`의 구현 기준, 완료 증거와 이력을 보관한다. 두 이름을 혼용하지 않는다.
내부 아키텍처·합성 데이터 설명에는 `Wealth Sandbox`, 고객 화면과 모바일 UI 설명에는
`Wealth Flow`를 사용한다.

## 문서 상태

- `ACTIVE`: 현재 작업의 실행·검토 기준
- `IMPLEMENTED`: 구현과 검증이 끝났고 남은 gap만 추적하는 명세
- `BLOCKED`: 외부 조건 또는 결정이 있어야 재개 가능한 문서
- `SUPERSEDED`: 더 최신 결정이나 명세가 내용을 대체한 문서
- `ARCHIVED`: 완료된 실행 이력 또는 배경 참고 문서

문서 본문이 과거 시점의 명령형 표현을 유지하더라도 header의 상태와
`superseded_by`를 우선한다.

## Codex가 읽을 순서

1. `MVP_SCOPE.md` — 제품 범위와 명시적 비범위
2. `IMPLEMENTATION_STATUS.md` — 현재 구현·배포 상태와 바로 다음 작업
3. `FRONTEND_REFACTOR_REVIEW_PLAN.md` — 현재 React Native 소스 검토 기준과 순서
4. `ISSUE_REGISTER.md`, `workstreams/frontend/ISSUE_REGISTER.md` — 현재 blocker, issue와 gap
5. `IMPLEMENTATION_DECISIONS.md`와 관련 ADR — 현재 유효하거나 대체된 결정
6. `ARCHITECTURE_GUIDE.md`, `TEST_STRATEGY.md` — 구조, 상태 소유권과 검증 기준
7. 현재 작업에 해당하는 구현·계약 문서
   - `MARKET_DATA_INTEGRATION_PLAN.md` — 외부 주식 종목 검색·현재가·기간별 차트 통합 실행계획
   - `MARKET_CHART_REPAIR_AND_PARITY_PLAN.md` — Victory Native 종목 차트 복구·중복 봉 방지·StockTracker 정보 확장 실행계획
   - `PORTFOLIO_BIOMETRIC_ONBOARDING_PLAN.md` — PIN 이후 기기 생체인증, 포트폴리오 홈 진입과 재실행 잠금 해제 계획
   - `API_CONTRACTS.md`
   - `DATA_MODEL.md`
   - `TABLE_DEFINITIONS.md`
   - `SECURITY_MODEL.md`
   - `TEST_STRATEGY.md`
   - `PERFORMANCE_EVIDENCE.md`
   - `PORTFOLIO_ARCHITECTURE.md`
   - `ENV_FILES_GUIDE.md`
   - `ENVIRONMENT_MATRIX.md`
   - `GOOGLE_CLOUD_DEPLOYMENT.md` — Cloud Run, Cloud SQL, Secret Manager와 APK 배포 절차
   - `COACH_EXPERIENCE_IMPLEMENTATION_SPEC.md`
   - `COACH_CONSULTATION_DATE_TIME_PICKER_SPEC.md`
   - `design_refactoring/Financial_app_HANWHA_PLUS_DESIGN_SYSTEM_CODEX_MODIFICATION_SPEC.md`
8. `REQUIREMENTS_TRACEABILITY.md`, `LIMITATIONS.md`, `DEMO_SCRIPT.md` — 주장과 검증 범위
9. `DEVELOPMENT_LOG.md`, `workstreams/<lane>/DEVELOPMENT_LOG.md` — append-only 구현 이력
10. 완료·이력 문서
   - `INTEGRATED_DEVELOPMENT_PLAN.md`
   - `CODEX_IMPLEMENTATION_PLAN.md`
   - `PARALLEL_DEVELOPMENT_GUIDE.md`
   - `Financial_app_CODEX_DETAILED_IMPLEMENTATION_SPEC.md`

## 문서 우선순위

충돌 시 다음 순서를 따른다.

```text
MVP_SCOPE
  > IMPLEMENTATION_DECISIONS / ADR
  > ARCHITECTURE / API / DATA / SECURITY / TEST 계약
  > 현재 ACTIVE 범위 계획
  > IMPLEMENTATION_STATUS / ISSUE_REGISTER
  > IMPLEMENTED 명세
  > SUPERSEDED / ARCHIVED 실행계획
  > 원본 상세 명세
```

## 변경 규칙

- scope 변경은 `MVP_SCOPE.md`에 먼저 반영한다.
- 구조 또는 기술 선택 변경은 ADR이나 `IMPLEMENTATION_DECISIONS.md`에 이유를 기록한다.
- 앱·서버 코드는 `ARCHITECTURE_GUIDE.md`의 module, dependency와 상태 소유권 규칙을 따르며 CI에서 자동 검증한다.
- 현재 React Native 검토는 `FRONTEND_REFACTOR_REVIEW_PLAN.md`를 따른다.
- `INTEGRATED_DEVELOPMENT_PLAN.md`는 DEV-0007~DEV-0014 완료 이력이며 현재 실행 순서를 지시하지 않는다.
- 기존 `codex/frontend`, `codex/backend` branch는 복구 이력으로 보존한다. 보조 worktree directory는 DEV-0008에서 제거했으며 재분리를 명시적으로 결정할 때만 `PARALLEL_DEVELOPMENT_GUIDE.md`를 다시 적용한다.
- API와 DB 변경은 계약 문서와 구현을 같은 변경에서 갱신한다.
- 모든 애플리케이션 소유 테이블과 DB 객체는 `TABLE_DEFINITIONS.md`의 `finapp_` prefix 규칙을 따른다.
- 작업 완료 여부는 테스트 결과를 확인한 후 `IMPLEMENTATION_STATUS.md`에 기록한다.
- 통합 commit은 `DEV-####`, frontend는 `FE-####`, backend는 `BE-####`와 대응하는 개발 로그 항목을 포함한다.
- 발견된 문제와 누락은 `ISSUE_REGISTER.md`에 등록하며 해결 후에도 삭제하지 않는다.
- 외부 blocker가 발생하면 문서에 재개 조건을 남기고 진행 가능한 다른 작업을 계속한다.
- 원본 상세 명세는 배경 기준선이므로 직접 축약하거나 삭제하지 않는다.
- 완료된 명세의 본문을 과거 사실과 다르게 다시 쓰지 않는다. 대신 상태,
  `superseded_by`, 완료 증거와 남은 gap을 header에 추가한다.
