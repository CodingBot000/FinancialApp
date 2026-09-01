# Limitations와 정직한 주장 범위

- 상태: DEV-0014 local hardening 최종 문서
- 원칙: 확인한 것과 아직 확인하지 않은 것을 분리한다.

## 확인된 범위

- 합성 사용자·계좌·거래·시세만으로 local Docker Compose E2E를 재현한다.
- Android API 36 emulator Development Build에서 OIDC, App Lock, refresh restart와 logout을 수동 확인했다.
- canonical OpenAPI, 실제 Fastify provider, mobile consumer fixture와 adapter를 35 operations/38 fixtures에 대해 추적한다.
- Testcontainers PostgreSQL에서 migration, role, ownership, append-only, concurrency, settlement/outbox/crypto invariant를 검증한다.
- production backend image의 runtime workspace dependency audit은 0건이다.

## 제품 기능 제한

- 단일 합성 기관과 `BALANCED_WORKER` dataset만 지원한다.
- 주문은 BUY market order만 지원한다. SELL, limit, partial fill, cancel은 범위 밖이다.
- risk profile은 planning preference일 뿐 투자 추천, 적합성 판정, 목표 배분이나 수익 보장을 생성하지 않는다.
- 실제 금융기관, 실제 시세, 실제 개인정보·계좌번호, 실제 자금 이동은 사용하지 않는다.
- push, realtime stream, offline ledger, 관리자 콘솔과 정식 store 배포는 없다.

## 환경·운영 제한

- 이번 증거는 local/Testcontainers/PostgreSQL Compose에 한정된다. 원격 managed PostgreSQL, TLS/backup, network/storage latency와 rollback은 검증하지 않았다.
- AWS KMS adapter는 fake client contract와 fail-closed bootstrap 경계까지만 검증했다. 실제 AWS credential, key policy, CloudTrail과 rotation은 미검증이다.
- local publisher는 outbox 불변조건을 보여주지만 외부 broker나 다중 instance 운영의 throughput/partition 검증은 아니다.
- process-local metrics는 private JSON snapshot이며 dashboard, alert routing, long-term retention은 구현하지 않았다.
- security/audit event의 장기 retention, export, SIEM과 규제 준수를 주장하지 않는다.

## 성능·의존성 제한

- query plan은 작은 합성 dataset의 index shape 회귀 gate다. capacity benchmark, 부하 시험 또는 production SLO 증거가 아니다.
- root audit은 Expo 경로 14건과 Drizzle Kit build-time 경로 4건, 총 moderate 18건을 유지한다. 현재 stable pin과 일치하고 runtime backend image는 0건이지만 원격 preview를 security-clean으로 판정하지 않는다.
- advisory 해소에는 upstream compatible release 또는 사용자의 명시적 위험 수용이 필요하다. `npm audit fix --force`나 비호환 downgrade는 적용하지 않았다.

## 아직 수동 확인이 필요한 항목

- iOS Development Build의 OIDC redirect, SecureStore와 Face ID
- Android/iOS 물리 기기의 biometric cancel, lockout, fallback과 background timing edge case
- 원격 HTTPS 환경의 redirect/CORS/certificate와 EAS Preview Build

위 항목은 `GAP-0002`, `GAP-0003`, `ISSUE-0002`, `ISSUE-0003`에서 계속 추적한다. 이 프로젝트는 금융 규제 준수, production readiness 또는 실제 투자 서비스 적합성을 주장하지 않는다.
