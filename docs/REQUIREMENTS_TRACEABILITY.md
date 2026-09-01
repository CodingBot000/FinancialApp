# Requirements Traceability

- 상태: DEV-0014 local hardening 최종 대응표
- 기준: `MVP_SCOPE.md`, `SECURITY_MODEL.md`, canonical OpenAPI

| 요구사항 | 구현 증거 | 자동/실제 검증 | 상태 |
|---|---|---|---|
| Expo React Native 화면과 상태 분리 | Dashboard, Accounts, Simulation, Order, Settings; Query/Zustand 분리 | mobile architecture + 97 tests | DONE |
| OIDC Authorization Code + PKCE | auth/session adapter, Keycloak realm | actual PKCE/JWT/refresh/logout smoke | DONE (local/Android emulator) |
| App Lock와 주문 전 biometric | LocalAuthentication adapter와 두 gate | component tests + Android emulator | DONE; physical/iOS gap |
| `/me`와 risk profile | owner-scoped GET/PUT, optimistic version | provider/consumer + actual version smoke | DONE |
| 단일 기관 connection/sync | HTTP simulator adapter, raw/processing/normalization | 12-step smoke + PostgreSQL assertions | DONE |
| 자산 조회와 차트 | summary/accounts/holdings/history/allocation | provider/mobile tests + actual smoke | DONE |
| deterministic simulation | persisted p10/p50/p90 engine result | 13-point actual smoke + tests | DONE |
| BUY preview/submit | quote expiry, biometric, idempotency | FILLED/REJECTED actual smoke | DONE |
| 현금 예약과 settlement | order/execution/ledger/position transaction | Testcontainers invariant + DB smoke | DONE |
| UNKNOWN reconciliation | POST no-retry, GET recovery, lease/backoff | UNKNOWN→FILLED actual smoke | DONE |
| transactional outbox | atomic event, claim, delivery receipt | crash-window/idempotency tests + DB smoke | DONE |
| 별도 institution simulator | independent Nest/Fastify service와 DB role | contract/integration + Compose | DONE |
| PostgreSQL + Drizzle migration | 10 forward migrations, prefixed objects | empty Testcontainers + preserved Compose | DONE |
| API 계약과 표준 오류 | two canonical OpenAPI documents | 35 operations/38 fixtures/provider/consumer gate | DONE |
| owner/scope isolation | JWT guard와 repository owner condition | auth/ownership/provider tests | DONE |
| 합성 identifier 암호화 | `FAE2` AES-GCM envelope와 HMAC lookup | wrong AAD/tamper/fake KMS tests | DONE (local boundary) |
| audit/security event와 redacted log | append-only stores, allowlist structured logger | role tests + actual log/security smoke | DONE (local) |
| readiness/metrics/resilience | bounded DB probe, private metrics, circuit breaker | unit/provider + actual Compose | DONE (local) |
| 핵심 query plan | four runtime-role actual JSON plans | expected index + <100ms local gate | DONE (non-SLO) |
| fresh-clone acceptance | `make acceptance-test` | clean volume, install, verify, build, migration, seed, smoke, audit | DONE |
| 실제 AWS KMS | adapter port/fake client only | actual AWS 미사용 | CURRENT_RUN_EXCLUDED |
| 원격 DB/HTTPS/EAS | 문서화된 향후 stage 11 | 원격 작업 미실행 | CURRENT_RUN_EXCLUDED |
| 투자 추천/실제 거래 | 명시적 비기능 범위 | recommendation output 없음 | EXCLUDED |

상세 테스트 명령과 계층은 `TEST_STRATEGY.md`, 실제 query plan은 `PERFORMANCE_EVIDENCE.md`, 남은 위험은 `ISSUE_REGISTER.md`와 `LIMITATIONS.md`를 따른다.
