# WM 코치 경험 구현 명세

- 상태: 구현 착수 가능 확정안
- 작성일: 2026-09-04
- 대상: `apps/mobile`
- 목표: 기존 금융 기능을 유지하면서 합성 자산과 투자 성향을 연결해 코치 중심 WM 경험을 짧고 명확하게 보여 준다.

## 1. 확정 결정

1. 하단 탭은 5개를 유지한다.
2. 기존 `플랜` 탭을 `코치` 탭으로 교체한다.
3. 기존 목표 자산 시뮬레이션은 삭제하지 않고 코치의 후속 전체 화면 `/plan`으로 이동한다.
4. 코치 기능은 기존 `AssetSummary`, `UserRiskProfile`, `updateRiskProfile`, `createSimulation`만 사용한다.
5. 신규 API, OpenAPI operation, 서버 module, DB table과 migration은 만들지 않는다.
6. 코치 진단과 제안 배분은 모바일의 결정적 규칙으로 계산한다. LLM이나 외부 추천 시스템을 도입하지 않는다.
7. 현재 주문은 주식 BUY만 지원하므로 코치 제안의 실행 CTA로 연결하지 않는다.
8. 핵심 CTA는 목표 시뮬레이션과 포트폴리오용 가상 상담 요청으로 제한한다.
9. 마이데이터 약관·동의·철회는 이번 범위에서 제외한다.
10. 모든 코치 결과에는 합성 데이터 기반 예시이며 실제 투자 권유·적합성 판단이 아니라는 문구를 표시한다.
11. 자산·금액·비중·기간·투자 성향·진단 결과처럼 데이터에 따라 달라지는 숫자와 값은 화면 코드에 하드코딩하지 않는다.
12. 신규 화면은 현재 `shared/design-system`의 component와 token을 우선 재사용한다.
13. 필요한 UI 표현이 기존 디자인 시스템에 없을 때만 기존 폴더·export·token·test 구조를 준수해 디자인 시스템을 확장한다.

### 1.1 화면 데이터 하드코딩 금지 원칙

- `coach-screen.tsx`, `risk-check-screen.tsx`, `simulation-screen.tsx` 같은 UI 파일에 `92%`, `60%`, `32%p`, `185400000`, `균형형` 등의 데이터 결과를 화면용 literal로 작성하지 않는다.
- 현재 자산과 투자 성향은 `PlatformApi`를 통해 조회하고, 제안 배분은 `allocation-presets.ts`, 차이와 설명 문구는 `coach-diagnosis.ts`에서 파생한다.
- UI component는 완성된 view model 또는 props를 렌더링하는 책임만 가진다.
- 문서의 `8% → 10%`, `92% → 60%`는 기본 fixture에서 기대하는 검증 예시이며 UI 구현 상수가 아니다.
- 설문 속 `15%`, 점수 경계, 제안 배분표와 상담 시간처럼 제품이 의도적으로 고정한 값은 model/config 상수로 관리한다. 재사용되는 고정값을 TSX JSX 안에 흩어 놓지 않는다.
- 테스트에서 기대 결과를 검증하기 위한 숫자 literal 사용은 허용한다.

### 1.2 기존 디자인 시스템 우선 원칙

- 화면을 만들기 전에 `apps/mobile/src/shared/design-system`에서 같은 역할의 component와 token이 있는지 먼저 확인한다.
- 텍스트, 버튼, 카드, 목록, 상태, 입력, 전체 화면과 간격·색상·타이포그래피는 기존 `AppText`, `Button`, `Card`, `ListRow`, `LoadingState`, `ErrorState`, `NoticeBanner`, `SegmentedControl`, `FullScreenPage`, `Screen`, `colors`, `spacing`, `radius`, `typography`를 우선 사용한다.
- feature 안에서 기존 공통 component와 동일한 버튼·카드·입력·상태 UI를 다시 만들지 않는다.
- feature 전용 의미를 가진 `AllocationComparison` 같은 조합 UI는 `features/coach/ui`에 둔다. 여러 feature에서 재사용할 수 있는 범용 primitive만 디자인 시스템으로 승격한다.
- raw hex color, 임의 font size, 임의 radius와 반복되는 magic spacing을 feature UI에 추가하지 않는다.

### 1.3 디자인 시스템 확장 규칙

기존 component로 요구사항을 표현할 수 없을 때만 다음 구조로 추가한다.

```text
apps/mobile/src/shared/design-system/
├── components/{component-name}.tsx
├── components/{component-name}.test.tsx 또는 design-system.test.tsx
├── components/index.ts
├── tokens/{필요한-token}.ts
└── index.ts
```

확장 시 다음을 모두 만족해야 한다.

1. 기존 component API와 시각 규칙을 깨지 않는다.
2. 색상·간격·radius·typography는 기존 token을 사용하고, 정말 새로운 의미가 있을 때만 token을 추가한다.
3. 새 component를 `components/index.ts`와 design-system root `index.ts`에서 public export한다.
4. disabled, pressed, selected, loading처럼 제공하는 상태와 접근성 role·label·state를 테스트한다.
5. `design-system:check`, TypeScript와 기존 design-system test를 통과한다.
6. 한 화면에서만 쓰는 장식 목적 component를 공통 디자인 시스템에 넣지 않는다.

## 2. 정보 구조와 사용자 흐름

### 2.1 하단 탭

```text
홈 · 종목 · 코치 · 주문 · 내 정보
```

- `코치`는 기존 `플랜`의 위치와 역할을 승계한다.
- 아이콘은 Ionicons의 `compass` / `compass-outline`을 사용한다.
- 주문 기능은 독립 탭으로 유지하지만 코치 제안과 직접 연결하지 않는다.

### 2.2 핵심 흐름

```text
코치 탭
├── 투자 성향 다시 진단 → 간이 진단 → 저장 → 코치 탭 갱신
├── 제안안으로 목표 확인 → 기존 목표 자산 시뮬레이션
└── 코치 상담 요청 → 방식·시간 선택 → 화면 내 완료
```

### 2.3 데모 기본 시나리오

기본 합성 데이터는 다음과 같다.

- 투자 성향: 균형형
- 투자 기간: 120개월
- 월 납입액: 1,500,000원
- 총자산: 185,400,000원
- 현재 배분: 현금 약 8%, 채권 0%, 주식 약 92%
- 균형형 제안 배분: 현금 10%, 채권 30%, 주식 60%

첫 진입에서 다음 메시지가 즉시 보여야 한다.

> 균형형 기준보다 주식 비중이 32%p 높아요.

별도 진단을 먼저 수행해야 코치 결과가 보이는 구조로 만들지 않는다.

## 3. 공통 데이터와 계산 규칙

### 3.1 투자 성향별 제안 배분

| 투자 성향 | 현금 | 채권 | 주식 |
|---|---:|---:|---:|
| 안정형 | 20% | 50% | 30% |
| 균형형 | 10% | 30% | 60% |
| 성장형 | 5% | 15% | 80% |

이 배분은 포트폴리오 시연을 위한 고정 예시다. 실제 상품 추천이나 투자 적합성 결과로 표현하지 않는다.

### 3.2 진단 산출 규칙

1. `AssetSummary.allocation`을 `CASH`, `BOND`, `EQUITY` 비중으로 정규화한다.
2. 누락된 자산군의 현재 비중은 0으로 간주한다.
3. 현재 배분과 투자 성향별 제안 배분의 차이를 percentage point로 계산한다.
4. 절댓값이 가장 큰 자산군을 대표 진단 항목으로 선택한다.
5. 표시 숫자는 정수로 반올림한다.
6. 가장 큰 차이가 5%p 이하면 `ALIGNED`, 초과하면 `NEEDS_ATTENTION`으로 분류한다.
7. 초과 비중은 `OVER`, 부족 비중은 `UNDER`로 분류한다.

### 3.3 진단 view model

```ts
type CoachDiagnosisStatus = 'ALIGNED' | 'NEEDS_ATTENTION';
type AllocationDirection = 'ALIGNED' | 'OVER' | 'UNDER';

interface CoachDiagnosis {
  readonly status: CoachDiagnosisStatus;
  readonly direction: AllocationDirection;
  readonly profileLabel: '안정형' | '균형형' | '성장형';
  readonly currentAllocation: AllocationPercentages;
  readonly suggestedAllocation: AllocationPercentages;
  readonly focusAssetClass: 'CASH' | 'BOND' | 'EQUITY';
  readonly differencePercentagePoints: number;
  readonly headline: string;
  readonly description: string;
}
```

카피는 UI에서 임의 조합하지 않고 순수 model 함수가 view model로 반환한다. 숫자 변화에 따라 화면과 테스트가 같은 규칙을 사용하게 한다.

### 3.4 진단 카피 규칙

초과 비중:

```text
{성향} 기준보다 {자산군} 비중이 {차이}%p 높아요.
현재 {자산군} 비중은 {현재}%입니다. 제안안에서는 {목표}%로 조정해 다른 자산군과의 균형을 살펴봅니다.
```

부족 비중:

```text
{성향} 기준보다 {자산군} 비중이 {차이}%p 낮아요.
현재 {자산군} 비중은 {현재}%입니다. 제안안에서는 {목표}%로 조정한 모습을 비교할 수 있어요.
```

기준에 가까움:

```text
현재 자산 배분이 {성향} 기준과 가까워요.
가장 큰 차이가 {차이}%p 이내입니다. 목표 금액과 납입 계획을 중심으로 다음 단계를 확인해 보세요.
```

## 4. 화면 명세

## 4.1 코치 홈

### 목적

현재 자산과 투자 성향이 실제로 연결되어 있다는 것을 첫 화면에서 보여 주고, 사용자가 진단·비교·시뮬레이션·상담 중 다음 행동을 선택하게 한다.

### 화면 순서와 최종 문구

#### A. 페이지 헤더

- 제목: `WM 코치`
- 설명: `내 자산과 투자 성향을 함께 보고, 지금 점검할 한 가지를 알려드려요.`

#### B. 투자 성향 카드

- 섹션 제목: `내 투자 성향`
- 대표 값: `{성향} · {투자 기간}년`
- 설명: `월 {월 납입액}씩 투자하는 계획을 기준으로 살펴봤어요.`
- CTA: `투자 성향 다시 진단`
- CTA 이동: `/coach-risk-check`

120개월은 `10년`, 60개월처럼 12로 나누어떨어지는 값은 `5년`으로 표시한다. 그 외에는 `{개월}개월`로 표시한다.

#### C. 대표 코치 인사이트 카드

- 카드 variant: `warm`
- 상단 label: `오늘의 코치 인사이트`
- 제목: `CoachDiagnosis.headline`
- 본문: `CoachDiagnosis.description`
- 보조 문구: `최근 자산 업데이트 기준`

기본 합성 데이터에서는 다음과 같이 표시한다.

- 제목: `균형형 기준보다 주식 비중이 32%p 높아요.`
- 본문: `현재 주식 비중은 92%입니다. 제안안에서는 60%로 조정해 다른 자산군과의 균형을 살펴봅니다.`

#### D. 현재와 제안안 비교 카드

- 섹션 제목: `현재와 코치 제안안`
- 설명: `투자 성향에 맞춘 예시 배분을 현재 자산과 비교했어요.`
- 비교 label: `현재` / `제안`
- 자산군 표시 순서: 현금, 채권, 주식
- 값 표시 형식: `{현재}% → {제안}%`

기본 합성 데이터:

| 자산군 | 표시 값 |
|---|---:|
| 현금 | `8% → 10%` |
| 채권 | `0% → 30%` |
| 주식 | `92% → 60%` |

비교 시각화는 기존 design token만 사용한다. 신규 차트 라이브러리를 추가하지 않는다. 접근성 label에는 세 자산군의 현재·제안 비중을 한 문장으로 제공한다.

#### E. 다음 행동 카드

- 제목: `다음 단계`
- 설명: `제안 배분으로 목표 자산의 예상 범위를 확인하거나 코치 상담을 요청할 수 있어요.`
- Primary CTA: `제안안으로 목표 확인`
- Primary 이동: `/plan`
- Secondary CTA: `코치 상담 요청`
- Secondary 이동: `/coach-consultation`

#### F. 고지 문구

```text
표시된 성향과 배분은 합성 데이터를 활용한 포트폴리오 예시이며 실제 투자 권유나 적합성 판단이 아닙니다.
```

`DemoDisclosure`에 위 문구를 명시적으로 전달한다. 기본 문구는 사용하지 않는다.

### 화면 상태

| 상태 | 표시 | CTA |
|---|---|---|
| 최초 loading | 헤더 아래 `자산과 투자 성향을 함께 확인하고 있어요.` | 없음 |
| success | 성향·인사이트·배분 비교·다음 행동 | 3개 CTA 활성 |
| cached refreshing | 기존 내용을 유지하고 `최신 정보를 확인하고 있어요.` caption | 기존 CTA 유지 |
| error, cached data 없음 | `코치 진단을 준비하지 못했습니다.` / `자산 정보를 다시 확인해 주세요.` | `다시 확인` |
| partial error, cached data 있음 | 기존 내용을 유지하고 warning `일부 정보를 새로 확인하지 못했습니다.` | 기존 CTA 유지 |

### 접근성

- 대표 인사이트 제목은 header role을 사용한다.
- 배분 비교 전체에 `현재 현금 8%, 채권 0%, 주식 92%. 제안 현금 10%, 채권 30%, 주식 60%.` 형식의 label을 제공한다.
- `%p`는 화면 문구에 유지하되 접근성 label에서는 `퍼센트포인트`로 읽히게 한다.
- 모든 CTA touch target은 기존 `Button` 기준을 따른다.

## 4.2 투자 성향 간이 진단

### 목적

세 문항으로 사용자의 선택을 기존 세 가지 `RiskProfile` 중 하나에 연결하고, 저장 결과가 코치 인사이트와 제안 배분에 즉시 반영되는 것을 보여 준다.

### 페이지 헤더

- 전체 화면 제목: `투자 성향 간이 진단`
- 설명: `세 가지 질문으로 포트폴리오용 투자 성향을 확인해 보세요.`

### 질문과 선택지

#### 질문 1

- 제목: `투자 자산이 단기간에 15% 하락한다면 어떻게 하시겠어요?`
- 선택지:
  - `일부 매도` — 0점
  - `그대로 유지한다` — 1점
  - `추가 투자` — 2점

#### 질문 2

- 제목: `이 자금을 사용할 시점은 언제인가요?`
- 선택지:
  - `3년 이내` — 0점, 36개월
  - `3~7년` — 1점, 60개월
  - `7년 이후` — 2점, 120개월

#### 질문 3

- 제목: `투자에서 더 중요하게 생각하는 결과는 무엇인가요?`
- 선택지:
  - `안정 우선` — 0점
  - `균형` — 1점
  - `성장 우선` — 2점

### 점수 매핑

| 합계 | 결과 |
|---:|---|
| 0~2 | 안정형 |
| 3~4 | 균형형 |
| 5~6 | 성장형 |

### 상태 전이와 문구

```text
LOADING_PROFILE
→ ANSWERING
→ RESULT_READY
→ SAVING
→ COMPLETE 또는 SAVE_ERROR
```

#### LOADING_PROFILE

- 문구: `현재 투자 성향을 확인하고 있어요.`

#### ANSWERING

- CTA: `진단 결과 확인`
- 세 질문에 모두 답하기 전에는 disabled
- CTA를 누르면 서버 저장 없이 먼저 결과 카드만 표시한다.

#### RESULT_READY

- label: `진단 결과`
- 제목: `안정형`, `균형형` 또는 `성장형`
- 설명:
  - 안정형: `자산의 안정적인 유지와 변동성 관리에 더 무게를 두는 성향이에요.`
  - 균형형: `안정성과 성장 가능성을 함께 고려하는 성향이에요.`
  - 성장형: `가격 변동을 감수하고 장기적인 성장 가능성에 더 무게를 두는 성향이에요.`
- Primary CTA: `이 성향으로 코칭 받기`
- Secondary CTA는 만들지 않는다. 기존 선택지를 다시 누르면 결과를 재계산한다.

#### SAVING

- Primary CTA loading: `이 성향으로 코칭 받기`
- 중복 submit 금지

#### COMPLETE

- `updateRiskProfile` 성공 시 `['risk-profile']` cache를 새 값으로 교체한다.
- `['current-user']`를 invalidate한다.
- 별도 완료 화면 없이 이전 코치 화면으로 돌아간다.
- 돌아온 코치 화면에서 새 성향과 제안 배분이 즉시 표시되어야 한다.

#### SAVE_ERROR

- banner 제목: `진단 결과를 저장하지 못했습니다.`
- 설명: `잠시 후 다시 시도해 주세요.`
- 답변과 계산된 결과를 유지한다.
- Primary CTA로 재시도할 수 있다.

### 저장 데이터

- `riskLevel`: 점수 결과
- `investmentHorizonMonths`: 질문 2에 매핑된 값
- `monthlyContribution`: 기존 profile의 값을 변경하지 않고 유지
- `expectedVersion`: 조회한 기존 profile의 version

### 고지 문구

```text
간이 진단 결과는 포트폴리오 시연을 위한 예시이며 실제 투자 적합성 판단이 아닙니다.
```

## 4.3 목표 자산 미리보기

### 기존 기능 유지

- 시작 자산
- 월 납입액
- 기간
- 목표 금액
- 서버 simulation 생성과 결과 재조회
- 목표 달성 가능성
- p10·p50·p90 차트
- 투자 수익 비보장 문구

### 변경 문구

- 전체 화면 제목: `목표 자산 미리보기`
- 설명: `코치 제안 배분으로 앞으로의 자산 흐름을 살펴보세요.`
- 배분 label: `코치 제안 배분`
- 배분 값: 현재 `RiskProfile`에 대응하는 현금·채권·주식 비중
- Submit CTA: `목표 결과 확인`

### 동작 변경

1. 기존 고정 배분을 사용하지 않는다.
2. `getRiskProfile` 성공 시 성향별 제안 배분을 사용한다.
3. profile 조회가 실패한 직접 진입에서는 균형형 배분을 fallback으로 사용한다.
4. 사용 중인 배분을 화면에 명시하고 같은 값을 `createSimulation` input에 전달한다.
5. 기존 입력 draft와 simulation 결과 저장 방식은 변경하지 않는다.

profile 조회 실패 시 다음 warning을 표시한다.

- 제목: `투자 성향을 확인하지 못했습니다.`
- 설명: `균형형 예시 배분으로 목표 결과를 확인합니다.`

화면 하단 `DemoDisclosure`에는 다음 문구를 명시적으로 전달한다.

```text
합성 데이터를 사용한 예상 결과이며 실제 수익이나 투자 성과를 보장하지 않습니다.
```

### 전체 화면 탐색

- `/plan`은 root Stack의 card route다.
- 기존 `FullScreenPage` 패턴과 동일한 중앙 제목·왼쪽 뒤로가기를 사용한다.
- 뒤로가기는 코치 탭으로 복귀한다.

## 4.4 코치 상담 요청

### 목적

실제 예약 backend 없이 코치 중심 서비스의 다음 행동을 완성한다.

### 페이지 헤더

- 전체 화면 제목: `코치 상담 요청`

### 상담 정보

- 카드 제목: `자산배분 점검`
- 설명: `현재 배분과 코치 제안안의 차이를 중심으로 상담하는 예시입니다.`

### 상담 방식

- 섹션 제목: `상담 방식`
- 선택지: `전화`, `화상`

### 희망 시간

- 섹션 제목: `희망 시간`
- 선택지:
  - `오늘 19:00`
  - `내일 13:00`
  - `내일 19:00`

### 요청 전 상태

- CTA: `상담 요청하기`
- 상담 방식과 희망 시간을 모두 선택하기 전 disabled
- 네트워크 요청과 loading 상태 없음

### 완료 상태

- 제목: `상담 요청이 완료되었어요.`
- 설명: `{상담 방식} 상담 · {희망 시간}`
- 보조 문구: `포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.`
- CTA: `코치 홈으로`
- CTA 동작: 이전 코치 화면으로 복귀

### 상태 소유권

- 방식, 시간과 완료 여부는 component `useState`로만 관리한다.
- Zustand, SecureStore, Query cache와 서버에 저장하지 않는다.

## 5. CTA와 이동 규칙

| 출발 화면 | CTA | 도착 | 동작 |
|---|---|---|---|
| 코치 홈 | 투자 성향 다시 진단 | `/coach-risk-check` | Stack push |
| 간이 진단 | 이 성향으로 코칭 받기 | 코치 홈 | 저장 성공 후 back |
| 코치 홈 | 제안안으로 목표 확인 | `/plan` | Stack push |
| 목표 자산 미리보기 | 뒤로가기 | 코치 홈 | Stack back |
| 코치 홈 | 코치 상담 요청 | `/coach-consultation` | Stack push |
| 상담 완료 | 코치 홈으로 | 코치 홈 | Stack back |

CTA를 눌렀을 때 존재하지 않는 화면, no-op, 외부 브라우저 또는 미구현 placeholder로 이동하면 안 된다.

## 6. 상태와 캐시 소유권

| 상태 | 소유권 | 비고 |
|---|---|---|
| 자산 요약 | TanStack Query `['wealth', 'summary']` | 기존 Dashboard cache와 동일 key 사용 |
| 투자 성향 | TanStack Query `['risk-profile']` | Settings와 동일 key 사용 |
| 코치 진단 | `useMemo`로 파생 | 저장하지 않음 |
| 설문 답변 | 간이 진단 component local state | 화면 이탈 시 폐기 |
| 설문 계산 결과 | 간이 진단 component local state | 답변 변경 시 재계산 |
| 상담 선택·완료 | 상담 component local state | 화면 이탈 시 폐기 |
| 시뮬레이션 입력 | 기존 Zustand draft | 유지 |
| 시뮬레이션 결과 | 기존 TanStack Query | 유지 |

새로운 전역 store를 만들지 않는다.

## 7. 파일 단위 구현 명세

## 7.1 신규 파일

### `apps/mobile/src/shared/planning/allocation-presets.ts`

- `RiskProfile`별 현금·채권·주식 배분 상수 정의
- 합계가 1인지 확인할 수 있는 순수 helper 제공
- 코치와 simulation이 같은 source of truth를 사용하게 함

### `apps/mobile/src/shared/planning/index.ts`

- allocation preset과 관련 type의 public export

### `apps/mobile/src/features/coach/model/coach-diagnosis.ts`

- allocation 정규화
- percentage point 차이 계산
- 대표 자산군 선택
- 상태·방향 분류
- 최종 headline과 description 생성
- React, Query와 navigation에 의존하지 않는 순수 함수

### `apps/mobile/src/features/coach/model/coach-diagnosis.test.ts`

- 기본 합성 데이터가 주식 32%p 초과 문구를 만드는지 검증
- 누락된 채권을 0으로 처리하는지 검증
- 안정형·균형형·성장형 target 검증
- 차이 5%p 이하 `ALIGNED` 검증
- 반올림과 동률 시 자산군 순서 검증

동률 우선순위는 `EQUITY → BOND → CASH`로 고정한다.

### `apps/mobile/src/features/coach/hooks/use-coach-diagnosis.ts`

- `usePlatformApi` 사용
- `getAssetSummary`와 `getRiskProfile` 병렬 조회
- 기존 query key 재사용
- cached data, refreshing, error, retry 상태 통합
- 두 응답으로 `CoachDiagnosis` 파생
- 다른 feature 내부 파일 import 금지

### `apps/mobile/src/features/coach/ui/coach-screen.tsx`

- 코치 홈 전체 UI
- navigation은 직접 수행하지 않고 다음 callback을 props로 받음
  - `onOpenRiskCheck`
  - `onOpenPlan`
  - `onOpenConsultation`
- 기존 `Screen`, `PageHeader`, `Card`, `Button`, `LoadingState`, `ErrorState`, `NoticeBanner`, `DemoDisclosure` 재사용
- 자산·성향·기간·납입액·배분·차이 숫자는 hook이 반환한 view model만 렌더링
- 기본 fixture 예시 숫자를 JSX string이나 style literal로 작성하지 않음
- raw color 사용 금지

### `apps/mobile/src/features/coach/ui/risk-check-screen.tsx`

- 세 문항, 점수 계산, 결과 표시, 저장 mutation 담당
- navigation은 `onBack`, `onComplete` callback 사용
- 기존 `FullScreenPage`, `SegmentedControl`, `Card`, `Button`, `NoticeBanner` 재사용
- 설문 문항, 점수와 기간 매핑은 model/config에서 가져오고 UI에 중복 하드코딩하지 않음
- 기존 profile 조회 실패 시 답변 UI를 표시하지 않음

### `apps/mobile/src/features/coach/ui/consultation-screen.tsx`

- 상담 방식·시간 선택과 완료 상태 담당
- 서버와 Query를 사용하지 않음
- navigation은 `onBack`, `onComplete` callback 사용
- 기존 `FullScreenPage`, `SegmentedControl`, `Card`, `Button`, `NoticeBanner` 재사용
- 상담 방식과 가상 시간대는 별도 local config에서 가져오고 JSX에 반복 작성하지 않음

### `apps/mobile/src/shared/design-system/**` — 조건부 변경

- 기존 component와 token만으로 구현 가능한 경우 변경하지 않음
- 범용 component 또는 token이 실제로 부족한 경우에만 1.3의 구조와 기준에 따라 추가
- feature 전용 배분 비교 UI는 디자인 시스템에 추가하지 않음

### `apps/mobile/src/features/coach/ui/coach-screen.test.tsx`

- 기본 인사이트와 8→10, 0→30, 92→60 표시 검증
- loading, fatal error와 cached partial error 검증
- 세 CTA callback 검증
- disclaimer 검증

### `apps/mobile/src/features/coach/ui/risk-check-screen.test.tsx`

- 미응답 CTA disabled
- 0~2 안정형, 3~4 균형형, 5~6 성장형 검증
- update payload가 기존 monthly contribution/version을 유지하는지 검증
- 성공 callback과 오류 후 답변 유지 검증

### `apps/mobile/src/features/coach/ui/consultation-screen.test.tsx`

- 미선택 CTA disabled
- 방식·시간 선택 후 CTA 활성
- 완료 문구와 callback 검증
- API가 호출되지 않는 구조 유지

### `apps/mobile/src/features/coach/index.ts`

- 세 screen과 필요한 public type만 export
- 내부 hook/model은 route에서 직접 import하지 않음

### `apps/mobile/src/app/(tabs)/coach.tsx`

- `CoachScreen` route adapter
- 세 callback을 Expo Router path로 연결
- feature public entry만 import

### `apps/mobile/src/app/coach-risk-check.tsx`

- `RiskCheckScreen` route adapter
- 기존 뒤로가기 Ionicon과 `router.back()` 사용

### `apps/mobile/src/app/coach-consultation.tsx`

- `ConsultationScreen` route adapter
- 완료 시 `router.back()`으로 코치 홈 복귀

### `apps/mobile/src/app/plan.tsx`

- 기존 `SimulationScreen`의 새 root route adapter
- 뒤로가기와 `router.back()` 연결

## 7.2 수정 파일

### `apps/mobile/src/app/(tabs)/_layout.tsx`

- `planIcon`을 `coachIcon`으로 교체
- `Tabs.Screen name="plan"` 제거
- `Tabs.Screen name="coach"` 추가
- 탭 순서를 `홈, 종목, 코치, 주문, 내 정보`로 변경
- title은 `코치`, icon은 `compass` / `compass-outline`

### `apps/mobile/src/app/(tabs)/plan.tsx`

- 파일을 삭제하고 역할을 `apps/mobile/src/app/plan.tsx`로 이동
- 기존 `SimulationScreen` 구현 파일은 유지

### `apps/mobile/src/app/_layout.tsx`

- `coach-risk-check`, `coach-consultation`, `plan`을 명시적 Stack screen으로 등록
- 기존 management route와 같은 `slide_from_right`, `card`, custom header hidden 정책 적용

### `apps/mobile/src/features/simulation/model/simulation-draft-store.ts`

- `toSimulationInput`이 allocation을 두 번째 인자로 받도록 변경
- 인자가 없으면 균형형 preset을 사용해 기존 호출 호환성 유지
- draft field와 Zustand store 구조는 변경하지 않음

예상 signature:

```ts
export function toSimulationInput(
  draft: SimulationDraft,
  allocation = allocationForRiskProfile('BALANCED'),
): CreateSimulationInput | undefined;
```

### `apps/mobile/src/features/simulation/ui/simulation-screen.tsx`

- 현재 risk profile 조회
- 해당 profile의 제안 배분 표시와 submit input 전달
- root 전체 화면용 `backIcon`, `onBack` props 추가
- 화면 제목·설명·CTA 문구를 4.3 기준으로 변경
- 조회 실패 시 균형형 fallback 사용
- profile 조회 실패 warning과 명시적 합성 데이터 고지 문구 추가
- 기존 simulation 결과와 error 처리 유지

### `apps/mobile/src/features/simulation/ui/simulation-screen.test.tsx`

- 균형형 기본 allocation submit 검증
- 성장형 profile에서 5/15/80 allocation submit 검증
- 화면 표시 배분과 submit payload 일치 검증
- 기존 result, validation test 유지

### `apps/mobile/src/features/simulation/model/simulation-draft-store.test.ts`

- 전달한 allocation 보존 검증
- allocation 미전달 시 균형형 fallback 검증
- 기존 입력 validation test 유지

### `apps/mobile/scripts/check-routes.mjs`

- 필수 route에 `coach`, `coach-risk-check`, `coach-consultation`, root `plan` 추가
- tab route의 기존 `plan` 제거
- 필수 tab label을 `홈, 종목, 코치, 주문, 내 정보`로 변경
- `analytics` icon 검사를 `compass`로 변경

## 7.3 구현 완료 시 갱신할 문서

### `docs/IMPLEMENTATION_DECISIONS.md`

신규 결정 추가:

```text
D-055: 모바일은 합성 AssetSummary와 planning preference를 사용해 결정적 규칙으로 예시 코치 진단과 제안 배분을 파생한다. 서버 risk profile이나 simulation을 실제 투자 추천·적합성 판단으로 확장하지 않으며 신규 backend 계약을 만들지 않는다.
```

### `docs/LIMITATIONS.md`

- 기존 `recommendation output 없음` 문구를 수정
- client-only 예시 코치 제안은 존재하지만 규제상 투자 추천, 적합성 판단, 실제 상품 추천이 아님을 명시
- 상담 요청이 화면 로컬 상태임을 명시

### `docs/REQUIREMENTS_TRACEABILITY.md`

- 코치 진단, 간이 성향 진단, 제안 배분, simulation 연결과 상담 demo 행 추가
- 자동 검증 파일과 Android 화면 검증 결과 연결

### `docs/IMPLEMENTATION_STATUS.md`

- 구현·테스트·Android 검증 완료 후에만 DONE 반영

### `docs/resume/HANWHA_LIFE_PLUS_WM_MOBILE_FRONTEND_PORTFOLIO.md`

- 주요 사용자 흐름을 `자산 → 성향 → 진단 → 제안 비교 → simulation/상담`으로 갱신
- 코치 기능이 client-only deterministic portfolio demonstration임을 명시
- 실제 투자 추천이나 상담 backend 경험으로 주장하지 않음

## 7.4 변경하지 않을 파일과 영역

- `services/platform-api/**`
- `services/institution-simulator/**`
- `contracts/openapi/**`
- DB schema와 migration
- 인증·SecureStore·생체인증
- 자산 Dashboard 구현
- 시장·종목 구현
- 주문 hook, 주문 API와 주문 화면
- 마이데이터 연결·동기화

## 8. 테스트와 검증 기준

### 8.1 자동 검증

필수 통과:

```text
architecture:check
route:check
design-system:check
typecheck
mobile Vitest
contract:check
```

신규 backend가 없으므로 backend test 수 증가를 요구하지 않는다. 기존 전체 gate는 회귀 확인 목적으로 그대로 통과해야 한다.

### 8.2 화면 검증 시나리오

#### 시나리오 A — 기본 코치 진단

1. 코치 탭 진입
2. 균형형·10년·월 150만원 확인
3. `주식 비중이 32%p 높아요` 확인
4. 현재 8/0/92와 제안 10/30/60 확인

#### 시나리오 B — 투자 성향 변경

1. `투자 성향 다시 진단` 선택
2. 성장형이 되는 답변 선택
3. 결과 확인 후 저장
4. 코치 홈에서 성장형과 제안 5/15/80 확인

#### 시나리오 C — simulation 연결

1. 코치 홈에서 `제안안으로 목표 확인` 선택
2. 성장형 제안 배분 5/15/80 표시 확인
3. 목표 결과 생성
4. `createSimulation` 요청 allocation과 화면 값 일치 확인
5. 뒤로가기로 코치 홈 복귀

#### 시나리오 D — 상담 demo

1. 코치 홈에서 `코치 상담 요청` 선택
2. 방식과 시간 미선택 상태에서 CTA disabled 확인
3. 전화와 희망 시간 선택
4. 완료 상태와 포트폴리오 고지 확인
5. 코치 홈 복귀

### 8.3 완료 조건

- 첫 코치 화면에서 3초 이내에 서비스 차별점이 읽힌다.
- 기본 합성 데이터에서 투자 성향, 실제 자산 배분과 제안 배분의 관계가 숫자로 일치한다.
- 화면 UI 파일에 자산·금액·비중·기간·성향·진단 결과의 데이터 literal이 없다.
- 투자 성향을 바꾸면 코치 headline, 비교 값과 simulation allocation이 함께 바뀐다.
- 모든 주요 CTA가 실제 route나 완료 상태로 연결된다.
- 기존 자산·종목·주문·내 정보 기능에 회귀가 없다.
- 신규 화면은 기존 디자인 시스템 component와 token을 우선 사용한다.
- 디자인 시스템을 확장했다면 public export, 상태·접근성 test와 기존 design gate를 모두 통과한다.
- 신규 API, DB와 전역 store가 없다.
- 화면 어디에서도 실제 투자 권유, 적합성 판정, 실제 상담 완료로 오인할 문구를 사용하지 않는다.

## 9. 명시적 비범위

- 실제 AI 코치 또는 생성형 응답
- 코치 목록, 프로필과 담당자 배정
- 채팅, 메시지와 상담 이력
- 실제 상담 예약·알림 발송
- 실제 상품 추천과 주문 basket
- 리밸런싱 주문 생성
- 자산배분별 수익률 비교 계산
- 여러 제안안 저장·버전 관리
- 성향 진단의 규제상 적합성·적정성 판단
- 마이데이터 동의·철회
- backend·OpenAPI·DB 변경

## 10. 권장 구현 순서

1. allocation preset과 순수 coach diagnosis model
2. 코치 홈 success UI와 기본 데이터 검증
3. 탭·route 변경
4. 간이 진단과 risk profile 저장 연결
5. simulation 동적 allocation 연결과 root 화면 전환
6. 상담 요청 로컬 완료 화면
7. component/model/route test
8. Android Emulator 주요 흐름 검증
9. 제한·추적·지원 포트폴리오 문서 갱신

이 순서를 따르면 서버나 기존 핵심 기능을 건드리지 않고도 각 단계가 독립적으로 검증 가능하다.
