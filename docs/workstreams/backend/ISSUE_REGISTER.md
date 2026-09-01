# Backend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `BE-ISSUE-0002`
- 다음 GAP ID: `BE-GAP-0003`
- active issue: `BE-ISSUE-0001`
- active gap: `BE-GAP-0002`

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

## Gap History

### BE-GAP-0001 — scheduled sync와 stale worker lease recovery

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 BE: BE-0004
- 누락/연기 이유: BE-0004는 connection, manual sync, immutable raw, normalization과 조회 API의 단일 vertical slice를 완료했다. scheduler와 다중 node lease 회수는 별도 concurrency/fault slice로 분리한다.
- 현재 영향: 정상 manual sync와 중복 활성 job 방지는 동작하지만 process가 `FETCHING` 이후 비정상 종료되면 자동 lease 만료·재claim이 아직 없다. 원격 환경에는 적용하지 않았다.
- 목표 Milestone: Milestone 3 / BE-0005
- 재확인 조건: scheduled claim, manual/scheduled 충돌, stale lock, timeout/500 retry backoff와 최대 시도 후 stable failure를 PostgreSQL concurrency test로 검증한다.
- 해결 BE: BE-0005
- 검증: PostgreSQL에서 두 worker 동시 claim 하나, retry→FAILED와 stale lease 회수를 자동 검증했다. clean Compose에서 scheduled sync attempt 1 완료 및 simulator 중단 후 `QUEUED:1`→재시작 후 `COMPLETED:2` 복구를 확인했다.

### BE-GAP-0002 — 주문 idempotency와 row-lock cash reservation

- 상태: DEFERRED
- 심각도: MEDIUM
- 발견 BE: BE-0007
- 누락/연기 이유: BE-0007은 ownership, exact decimal과 immutable quote preview를 독립 계약/migration slice로 확정했다. 주문 생성 transaction과 외부 submit을 quote 생성 transaction에 결합하지 않는다.
- 현재 영향: quote preview는 가능하지만 `POST /api/v1/orders`는 아직 제공하지 않으며 현금 예약도 발생하지 않는다.
- 목표 Milestone: Milestone 5 / BE-0008
- 재확인 조건: 동일 key/same payload 재사용, 다른 payload conflict, cash row lock과 100만 원/80만 원 동시 주문 하나만 성공, available/reserved 합계 보존을 PostgreSQL concurrency test로 검증한다.
- 해결 BE:
- 검증: BE-0007에서 quote ownership/immutable 저장까지만 자동·Compose 검증했다.

## 단계별 검토 이력

- BE-0003 (2026-09-02): `BE-ISSUE-0001` 변화 없음. 신규 issue/gap 없음. clean PostgreSQL migration과 seed 2회, prefix/권한 catalog 검사, 전체 `npm run verify`, simulator runtime audit 0으로 확인했다.
- BE-0004 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0001`을 등록했다. clean PostgreSQL에서 실제 simulator HTTP sync 2회, raw immutable 권한, derived dedup, prefix/role catalog, 전체 `npm run verify`, platform runtime audit 0을 확인했다.
- BE-0005 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0001`을 RESOLVED 처리했다. concurrency/retry/lease 자동 테스트, scheduled Compose sync, 실제 simulator outage backoff 복구, 전체 `npm run verify`를 확인했다. 신규 issue/gap 없음.
- BE-0006 (2026-09-02): `BE-ISSUE-0001` 변화 없음. versioned synthetic assumption, deterministic engine, ownership, PostgreSQL immutable 결과 저장, clean migration/prefix/role catalog, 전체 `npm run verify`와 platform runtime audit 0을 확인했다. 신규 issue/gap 없음.
- BE-0007 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0002`를 등록했다. quote ownership, exact fixed-decimal, immutable privilege, clean migration/prefix/role catalog, 전체 `npm run verify`와 platform runtime audit 0을 확인했다.

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
