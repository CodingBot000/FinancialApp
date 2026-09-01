# Local Query Plan Evidence

- 상태: DEV-0013 local hardening evidence
- 측정일: 2026-09-02
- 환경: PostgreSQL 17.6 Compose, `financial_platform_app` runtime role, 합성 보존 dataset
- 실행: `make performance-test`

이 문서는 작은 합성 dataset에서 query/index shape와 회귀를 검증한다. capacity benchmark, 원격 DB 성능 또는 production SLO 증거가 아니다. 자동 gate는 각 query가 의도한 `finapp_` index를 사용하고 local execution time이 100ms 미만인지 확인한다. 출력에는 user/account/order ID나 credential을 포함하지 않는다.

## 결과

| Query | Endpoint/job | 사용 index | Node 요약 | Execution |
|---|---|---|---|---:|
| latest asset snapshots | `GET /assets/summary`, history 기반 | `finapp_idx_asset_snapshot_user_date` | Limit → Index Scan | 0.213ms |
| owner account holdings | `GET /holdings?accountId=` | `finapp_uq_holding_account_instrument`, `finapp_pk_instrument` | Sort → Nested Loop → Index Scan | 0.308ms |
| owner order page | `GET /orders` | `finapp_idx_order_user_created`, `finapp_uq_execution_order` | Limit → Nested Loop → Index Scan | 0.357ms |
| reconciliation claim | background UNKNOWN recovery | `finapp_idx_reconcile_claim` | Limit → LockRows → Sort → Index Scan | 0.348ms |

모든 수치는 DEV-0014 clean `make acceptance-test` 안의 같은 `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` 실행 결과다. 네 query 모두 runtime role로 실행됐고 `remoteResourcesUsed:false`를 반환했다.

## 발견과 수정

수정 전 owner order page는 `finapp_idx_order_user_created(user_id, created_at DESC)` 뒤 UUID tie-breaker를 incremental sort했다. local 측정은 1.458ms였지만 repository의 실제 keyset 정렬 `(created_at DESC, id DESC)`과 index가 완전히 일치하지 않았다.

`0009_finapp_order_list_index`는 같은 prefix-compliant index를 `(user_id, created_at DESC, id DESC)`로 재생성했다. 수정 직후 plan은 `Incremental Sort` 없이 1.126ms였고 DEV-0014 clean 검증 run은 0.357ms, shared hit 8이었다. migration은 빈 Testcontainers PostgreSQL과 보존 Compose에 forward 적용했다.

## 해석과 제한

- 현재 dataset이 작으므로 절대 latency보다 expected index와 sort shape를 회귀 기준으로 사용한다.
- holdings는 instrument code 표시 순서를 위한 작은 in-memory quicksort가 남는다. owner/account filtering과 join은 unique/PK index를 사용하므로 현재 범위에서 추가 index는 만들지 않는다.
- reconciliation은 claimable row가 적어 sort 비용이 미미하고 predicate는 claim index를 사용한다.
- 원격 managed PostgreSQL의 network, storage, autovacuum, 실제 cardinality와 concurrency는 측정하지 않았다. 단계 11이 별도 승인되면 동일 script가 아니라 환경에 맞는 비파괴 plan capture 계획을 새로 승인한다.
