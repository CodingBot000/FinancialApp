# React Native 프런트엔드 리팩터링 검토 계획

- 상태: `ACTIVE`
- 범위: `apps/mobile`, 모바일 설정, 모바일 테스트, 모바일의 API 소비 경계
- 제외: backend service 구현, DB, migration, backend 내부 아키텍처와 배포 변경
- 기준 SHA: `4bc7400` + 2026-09-10 문서 working tree
- 문서 기준일: 2026-09-10
- 소스 검토 상태: `NOT_STARTED`
- 대체 관계: 완료된 `INTEGRATED_DEVELOPMENT_PLAN.md` 이후의 현재 모바일 검토 계획
- 남은 외부 검증: `ISSUE-0017`, `GAP-0002`, `GAP-0003`, `GAP-0010`
- 선행 확인: `GAP-0011` Cloud demo 모바일 인증 경계 문서·소스 대조

## 1. 목적

현재 동작을 유지하면서 React Native 코드의 구조적 부채, 상태 소유권 혼선,
native lifecycle 위험, 렌더링 비용, 접근성 누락과 테스트 취약 구간을 근거 기반으로
찾는다. 이 문서는 곧바로 코드를 수정하라는 지시서가 아니라 소스 검토의 범위, 순서,
판정 기준과 결과 형식을 고정한다.

소스 검토와 리팩터링 구현은 분리한다.

1. 검토 단계에서는 읽기, 정적 분석과 비파괴 검증만 수행한다.
2. 발견사항을 우선순위와 회귀 위험으로 분류한다.
3. 사용자가 구현을 요청한 항목만 작은 변경 단위로 리팩터링한다.
4. backend 변경이 필요한 문제는 이번 검토에서 구현하지 않고 계약 경계 문제로만 기록한다.

## 2. 검토 범위

### 포함

- Expo Router route, layout과 provider composition
- feature-first 구조와 public export
- TanStack Query query/mutation/cache lifecycle
- Zustand와 React local state의 소유권
- 로그인, session, SecureStore, App Lock과 생체인증의 모바일 경계
- launch onboarding과 native permission lifecycle
- 자산, 시장, 시뮬레이션, 코치, 주문과 내 정보 UI
- 디자인 시스템, 금융 숫자 표시, 접근성과 Reduce Motion
- Victory Native/Skia chart input transform과 렌더링 경계
- 모바일 API adapter, response mapper와 ProblemDetails 소비
- 모바일 unit/component/route/native smoke test의 안전망

### 제외

- `services/platform-api/**`
- `services/institution-simulator/**`
- PostgreSQL schema, query, migration과 backend transaction
- Cloud Run/Cloud SQL resource 변경과 재배포
- API 또는 OpenAPI 계약 변경 구현

모바일에서 계약을 잘못 소비하는지 판단하는 데 필요한 canonical schema와 fixture는
읽을 수 있지만 backend 구현 품질은 평가하지 않는다.

## 3. 판정 원칙

- 파일 길이만으로 리팩터링을 결정하지 않는다.
- 사용자 영향, 변경 빈도, 결함 가능성, 중복 범위와 테스트 안전망을 함께 본다.
- 현재 통과하는 동작을 바꾸는 제안은 회귀 테스트와 rollback 단위가 있어야 한다.
- 새로운 상태관리 도구나 대형 dependency 도입은 기본 해법으로 제안하지 않는다.
- 공통화는 동일한 책임과 변경 이유가 세 곳 이상 확인될 때 우선 검토한다.
- 성능 문제는 추정과 측정 결과를 구분한다.
- iOS/물리 기기 미검증은 코드 결함으로 단정하지 않고 기존 issue/gap과 연결한다.

## 4. 검토 기준과 비중

| 기준 | 비중 | 주요 확인점 |
|---|---:|---|
| 구조와 의존성 | 15 | route 비대화, deep import, feature 간 결합, `shared` 역방향 의존 |
| 상태 소유권 | 15 | Query 데이터 복제, Zustand 과사용, Context 비대화, cache 갱신 불일치 |
| Effect와 lifecycle | 15 | effect dependency, AppState 구독, timer 정리, 중복 native prompt |
| API·오류·보안 경계 | 15 | DTO 직접 노출, token/config 저장, POST retry, 오류 누락과 fail-open |
| Component 책임과 재사용 | 10 | 통신·상태전이·표현의 혼재, 과도한 props, 잘못된 공통화 |
| 렌더링 성능 | 10 | 불필요한 재렌더, chart 변환 반복, 목록 비가상화, 불안정한 callback/value |
| RN UX·접근성·내비게이션 | 10 | safe area, font scale, touch target, Reduce Motion, back/deep link |
| 테스트 안전망 | 10 | 구현 세부사항 결합, 핵심 상태 전이 누락, native/manual gap 구분 |

점수는 우선순위를 보조하는 도구다. 인증, 주문, 개인정보 노출처럼 사용자 영향이 큰
문제는 총점과 무관하게 높은 우선순위를 부여할 수 있다.

## 5. 리팩터링 신호

다음은 자동 실패 기준이 아니라 상세 검토를 시작하는 신호다.

- route가 API 호출, store 구현 또는 feature internal file을 직접 사용한다.
- 한 화면이 데이터 조회, mutation, 상태 전이, navigation과 표현을 동시에 소유한다.
- 서버 응답이 Zustand, Context 또는 local state에 장기 복제된다.
- 서로 의존하는 effect가 세 개 이상이거나 cleanup 없는 timer/subscription이 있다.
- 동일한 formatter, query key, error mapping 또는 상태 전이 규칙이 여러 feature에 복제된다.
- component props가 업무 상태와 표현 옵션을 지나치게 함께 전달한다.
- render 중 chart/date/decimal 변환이나 큰 배열 정렬을 반복한다.
- `ScrollView`가 큰 동적 목록을 직접 렌더링한다.
- Context value, selector, callback 또는 object가 매 render마다 불필요하게 바뀐다.
- accessibility label이 표시 값과 다르거나 금액 숨김 상태를 우회한다.
- component test가 사용자 결과보다 내부 hook 호출 순서와 구현 세부사항에 결합한다.
- mobile 공개 환경변수와 session/token 경계가 문서 설명과 다르다.

## 6. 우선순위

| 등급 | 의미 | 예시 |
|---|---|---|
| P0 | 즉시 확인이 필요한 보안·데이터·거래 정확성 문제 | token 노출, 주문 POST 재전송, 인증 fail-open |
| P1 | 실제 결함 가능성이 높거나 변경을 계속 어렵게 만드는 구조 문제 | 상태 이중화, lifecycle race, feature 경계 위반 |
| P2 | 측정 가능한 성능·접근성·테스트 품질 문제 | chart 반복 계산, 목록 렌더링, 취약한 테스트 |
| P3 | 가독성·이름·국소 중복 개선 | 작은 component 분리, fixture/builder 정리 |

## 7. 소스 검토 순서

1. 모바일 파일 인벤토리, route와 dependency graph를 만든다.
2. root layout, provider composition과 navigation 경계를 검토한다.
3. `shared`의 API, 인증, 저장소, Query client와 디자인 시스템을 검토한다.
4. launch/onboarding/App Lock/native permission lifecycle을 검토한다.
5. 주문의 생체인증, idempotency, no-retry와 UNKNOWN 복구 소비 흐름을 검토한다.
6. 자산·시장·시뮬레이션·코치의 Query/model/chart/UI 경계를 검토한다.
7. 내 정보와 나머지 화면의 상태, navigation과 공통 component 사용을 검토한다.
8. 렌더링 hot path, 목록과 chart 변환을 검토한다.
9. 모바일 테스트가 위 위험을 실제로 보호하는지 검토한다.
10. 발견사항을 P0~P3와 안전한 구현 묶음으로 정리한다.

## 8. 발견사항 기록 형식

```text
[P1][State ownership] 제목

위치: 파일:라인
근거: 현재 코드에서 확인한 사실
영향: 사용자 동작, 유지보수 또는 회귀 위험
권장 리팩터링: 책임 이동 또는 분리 방향
필요 회귀 테스트: 보존해야 하는 동작
예상 난이도: S | M | L
확신도: HIGH | MEDIUM | LOW
```

근거가 부족한 항목은 결함으로 단정하지 않고 `확인 필요`로 분리한다.

## 9. 검증 기준

실제 script 존재 여부와 현재 명령은 소스 검토 시작 시 먼저 확인한다. 문서 기준의 예상
검증 범위는 다음과 같다.

- mobile formatter, lint와 strict typecheck
- mobile unit/component test
- route와 design-system 검사
- mobile import boundary와 cycle 검사
- 변경 feature의 Android native smoke
- iOS/물리 기기 항목은 기존 issue/gap에 실제 결과 또는 미검증 사유 기록

검토 단계에서는 실패를 고치기 위해 소스를 변경하지 않는다. baseline 실패가 있으면 재현
명령, 영향 범위와 기존 실패 여부만 기록한다.

## 10. 완료 조건

- backend를 제외한 모바일 검토 범위가 파일 단위로 기록된다.
- 모든 발견사항에 근거 위치, 영향, 우선순위와 회귀 테스트가 있다.
- 즉시 수정할 항목과 보류할 항목이 구분된다.
- 구조 변경이 필요한 제안은 ADR 필요 여부를 표시한다.
- 단순 취향이나 파일 길이만으로 만든 리팩터링 제안이 없다.
- 사용자가 다음 구현 묶음을 선택할 수 있는 순서와 예상 난이도가 제공된다.
