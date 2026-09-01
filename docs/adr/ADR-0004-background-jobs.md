# ADR-0004: 비동기 작업과 복구 방식

- 상태: Accepted
- 날짜: 2026-09-01

## Context

MyData sync, UNKNOWN 주문 reconciliation과 outbox 처리는 실패 후 재시작 가능한 background 작업이 필요하다. 프로젝트 범위에서 Kafka나 별도 workflow engine은 과도하다.

## Decision

- PostgreSQL job table과 Spring scheduler를 사용한다.
- worker는 짧은 transaction에서 처리할 job을 claim한다.
- 복수 instance 안전성을 위해 `FOR UPDATE SKIP LOCKED` 또는 동등한 원자적 claim query를 사용한다.
- 외부 HTTP 호출 중 DB lock이나 transaction을 유지하지 않는다.
- job에는 상태, attempt, next_attempt_at, locked_at, locked_by, last_error_code를 저장한다.
- retry는 지수 backoff와 최대 횟수를 사용하되 주문 submit 자체는 자동 재전송하지 않는다.
- UNKNOWN 주문은 simulator의 clientOrderId status query로 복구한다.
- outbox는 Milestone 6에서 settlement transaction과 함께 기록하고 idempotent consumer로 처리한다.

## Consequences

- 메시지 브로커 없이 복구 가능한 작업을 구현할 수 있다.
- polling latency가 있으므로 실시간 체결 UX는 제공하지 않는다.
- job claim과 duplicate execution에 대한 concurrency integration test가 필요하다.
