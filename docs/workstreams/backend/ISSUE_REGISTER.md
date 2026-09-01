# Backend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `BE-ISSUE-0004`
- 다음 GAP ID: `BE-GAP-0003`
- active issue: `BE-ISSUE-0001`
- active gap: 없음

backend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. frontend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Active Issue

### BE-ISSUE-0001 — Drizzle Kit build-time transitive moderate advisory

- 상태: OPEN
- 심각도: MEDIUM
- 발견 BE: BE-0001
- 관련 contract/migration revision: `0000_finapp_platform_baseline`, `0000_finapp_simulator_baseline`
- 내용: current stable `drizzle-kit@0.31.10`이 더 이상 유지되지 않는 `@esbuild-kit/*`와 advisory 대상 `esbuild<=0.24.2`를 build-time dependency로 포함한다. root `npm audit`의 Expo 14건에 4건이 추가되어 moderate 18, high/critical 0이다.
- 영향: Drizzle schema generation을 실행하는 개발/CI toolchain에만 존재한다. production image의 workspace-scoped `npm ci --omit=dev` 결과는 vulnerability 0이며 runtime에는 Drizzle Kit과 esbuild를 포함하지 않는다.
- 해결 조건: Drizzle Kit stable이 해당 dependency를 제거한 버전으로 갱신되고 migration generation/check, Testcontainers migration, lint, typecheck와 build가 모두 통과한다. 호환성 검증 없이 beta 강제 업그레이드 또는 전역 esbuild override를 적용하지 않는다.
- 목표 BE: Milestone 1 통합 전 upstream 재확인, 늦어도 Milestone 6 release gate 전 해결
- 해결 BE:
- 검증: BE-0009 `npm audit --json` moderate 18/high 0/critical 0. simulator Docker runtime stage는 144 package, vulnerability 0을 보고했다.

## Resolved Issue History

### BE-ISSUE-0003 — Developer audit correlation ID 미전파

- 상태: RESOLVED
- 심각도: LOW
- 발견 BE: BE-0010 final review
- 관련 contract/migration revision: `platform-v1` developer routes / `0006_finapp_settlement_audit`
- 내용: developer action audit이 요청 correlation ID 대신 고정 문자열을 기록했다.
- 영향: 기능 결과에는 영향이 없지만 요청과 audit event의 추적 연결성이 약해졌다.
- 해결 조건: Fastify가 정규화한 correlation ID가 service와 audit insert까지 전달되고 E2E에서 검증될 것.
- 목표 BE: BE-0010
- 해결 BE: BE-0010
- 검증: scenario/reset actual Fastify 요청의 correlation ID를 audit mock에서 확인하고 platform/root 전체 gate를 통과했다.

### BE-ISSUE-0002 — 동일 생성 시각 주문의 cursor pagination 누락

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 BE: BE-0010 final review
- 관련 contract/migration revision: `platform-v1` `listOrders`
- 내용: `(created_at DESC, id DESC)` 정렬과 달리 cursor 조건이 `created_at`만 비교해 timestamp 동률 주문을 건너뛸 수 있었다.
- 영향: 주문 목록 page 경계에서 일부 과거 주문이 표시되지 않을 수 있었다.
- 해결 조건: 정렬과 cursor가 같은 복합 keyset을 사용하고 timestamp 동률 pagination test가 통과할 것.
- 목표 BE: BE-0010
- 해결 BE: BE-0010
- 검증: 동일 `created_at` 네 주문을 2개씩 조회해 중복·누락 없는 PostgreSQL integration test와 전체 gate를 통과했다.

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

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 BE: BE-0007
- 누락/연기 이유: BE-0007은 ownership, exact decimal과 immutable quote preview를 독립 계약/migration slice로 확정했다. 주문 생성 transaction과 외부 submit을 quote 생성 transaction에 결합하지 않는다.
- 현재 영향: 없음. external submit/settlement/reconciliation은 설계된 local transaction 다음 단계인 BE-0009 범위다.
- 목표 Milestone: Milestone 5 / BE-0008
- 재확인 조건: 동일 key/same payload 재사용, 다른 payload conflict, cash row lock과 100만 원/80만 원 동시 주문 하나만 성공, available/reserved 합계 보존을 PostgreSQL concurrency test로 검증한다.
- 해결 BE: BE-0008
- 검증: 동일 key 20개 동시 요청에서 주문 하나와 동일 응답, 다른 hash conflict, 1,540만 원에서 800만 원 주문 두 개 중 하나만 예약됨을 PostgreSQL 17.6에서 확인했다. clean Compose 100만 원 계좌도 동일하게 one-winner와 balance 합계 보존을 통과했다.

## 단계별 검토 이력

- BE-0003 (2026-09-02): `BE-ISSUE-0001` 변화 없음. 신규 issue/gap 없음. clean PostgreSQL migration과 seed 2회, prefix/권한 catalog 검사, 전체 `npm run verify`, simulator runtime audit 0으로 확인했다.
- BE-0004 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0001`을 등록했다. clean PostgreSQL에서 실제 simulator HTTP sync 2회, raw immutable 권한, derived dedup, prefix/role catalog, 전체 `npm run verify`, platform runtime audit 0을 확인했다.
- BE-0005 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0001`을 RESOLVED 처리했다. concurrency/retry/lease 자동 테스트, scheduled Compose sync, 실제 simulator outage backoff 복구, 전체 `npm run verify`를 확인했다. 신규 issue/gap 없음.
- BE-0006 (2026-09-02): `BE-ISSUE-0001` 변화 없음. versioned synthetic assumption, deterministic engine, ownership, PostgreSQL immutable 결과 저장, clean migration/prefix/role catalog, 전체 `npm run verify`와 platform runtime audit 0을 확인했다. 신규 issue/gap 없음.
- BE-0007 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0002`를 등록했다. quote ownership, exact fixed-decimal, immutable privilege, clean migration/prefix/role catalog, 전체 `npm run verify`와 platform runtime audit 0을 확인했다.
- BE-0008 (2026-09-02): `BE-ISSUE-0001` 변화 없음. `BE-GAP-0002`를 RESOLVED 처리했다. 20-way idempotency, cash row-lock oversubscription, balance conservation, clean migration/prefix/role catalog, 전체 `npm run verify`와 platform runtime audit 0을 확인했다. 신규 issue/gap 없음.
- BE-0009 (2026-09-02): `BE-ISSUE-0001` 변화 없음. 중앙 `GAP-0005`를 RESOLVED 처리했다. simulator actual HTTP scenario, 10-way idempotency, clean migration/seed 2회, production admin 404/no-mutation, Compose smoke와 simulator runtime audit 0을 확인했다. 신규 backend issue/gap 없음.
- BE-0010 (2026-09-02): `BE-ISSUE-0001` 변화 없음. 중앙 `GAP-0006`, `ISSUE-0005`~`ISSUE-0007`을 RESOLVED 처리했다. settlement/reconciliation concurrency, 동일 timestamp pagination, audit correlation/권한, production developer module 미등록, clean actual HTTP order flow와 두 runtime audit 0을 확인했다. 신규 active backend issue/gap 없음.

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
