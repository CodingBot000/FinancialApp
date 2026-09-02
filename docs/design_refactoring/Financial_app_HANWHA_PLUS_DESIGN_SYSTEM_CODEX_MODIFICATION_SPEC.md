# Financial_app 한화 PLUS 스타일 디자인 시스템 및 고객용 UI 전환 지시서

- 문서 목적: Codex가 현재 `CodingBot000/FinancialApp` 저장소를 직접 분석한 뒤, 기존 기능을 보존하면서 모바일 앱 전체를 고객 중심의 한화 PLUS 계열 톤앤매너로 전환하도록 지시한다.
- 대상 저장소: `CodingBot000/FinancialApp`
- 기준 브랜치: Codex 실행 시점의 현재 작업 브랜치
- 작성 기준일: 2026-09-02
- 대상 기술: React Native 0.86 / Expo 57 / Expo Router / TypeScript / TanStack Query / Zustand / Victory Native / Skia / Reanimated
- 결과물 성격: 단순 색상 교체가 아니라 **디자인 시스템 구축, 고객 언어 전환, 내비게이션 정리, 금융 숫자 강조, 실제 차트 고도화, 신규 종목 조회 화면 통합**까지 포함하는 구현 지시서
- 중요: 이 문서는 `docs/MARKET_DATA_INTEGRATION_PLAN.md`의 **모바일 UI·내비게이션·카피 부분만 보완·대체**한다. KIS 연동, API 계약, DB, 인증, 캐시, 장애처리 결정은 변경하지 않는다.

---

## 0. Codex에 대한 실행 명령

이 문서는 검토 의견서가 아니라 **직접 구현 지시서**다.

Codex는 다음 원칙으로 작업한다.

1. 계획만 작성하고 중단하지 말고 실제 코드를 수정한다.
2. 작업 시작 전에 현재 working tree를 확인한다.
3. 사용자가 별도로 구현 중인 종목 조회 화면이 untracked/modified 상태일 수 있으므로 절대 reset, checkout, clean, stash, overwrite 하지 않는다.
4. 먼저 현재 파일과 변경사항을 읽고, 이 문서의 디자인 시스템을 그 위에 적용한다.
5. 현재 정상 동작하는 인증, 생체인증, TanStack Query, Zustand, 주문 상태, 시뮬레이션, API 계약, 백엔드 동작을 보존한다.
6. UI 개편을 이유로 API DTO, OpenAPI 계약, DB schema, 백엔드 transaction을 임의로 변경하지 않는다.
7. 내부 클래스명과 기술용어는 유지할 수 있지만, **사용자에게 보이는 문구·접근성 라벨·앱 이름·탭 이름에는 개발자용 용어가 노출되면 안 된다.**
8. 디자인 변경 후 모든 관련 테스트를 수정하고 `npm run verify`를 통과시킨다.
9. 모바일 화면에서 반복되는 색상·폰트·간격·카드·버튼 스타일을 개별 `StyleSheet`에 다시 복사하지 않는다.
10. 한화 및 PLUS의 실제 로고, 트라이서클, 워드마크, 저작권 이미지를 복제하지 않는다. 디자인 방향만 참고하고 독립적인 포트폴리오 브랜드로 구현한다.

---

# 1. 최종 목표

현재 앱은 기능과 상태 처리는 잘 구성되어 있으나 시각적으로는 다음 성격이 강하다.

```text
Dark Navy
+ Neon Mint
+ 개발용 Dashboard
+ Sandbox / Dataset / Contract / Engine 같은 기술 문구
```

최종 결과는 다음 성격이어야 한다.

```text
Light-first
+ White / Warm Off-white
+ Black 중심의 강한 Typography
+ Hanwha Orange를 절제한 Accent
+ 큰 금융 숫자
+ 넓은 여백
+ 얕은 Border와 부드러운 Card
+ 고객 결과 중심 문구
+ 실제 금융앱 수준의 Chart Interaction
```

목표 이미지는 “한화 앱 복제품”이 아니다.

> **한화 PLUS 계열의 Tech·Data 기반 금융 솔루션 감성, PLUS 파이의 쉬운 고객 언어, 최신 한화투자증권 앱의 데이터 밀도와 투자 UI 문법을 참고한 독립적인 Wealth Management 앱**

이어야 한다.

---

# 2. 공개 자료를 기반으로 한 디자인 해석

## 2.1 한화 PLUS에서 가져올 원칙

공개된 한화 PLUS 설명은 다음을 반복해서 강조한다.

- 테크와 데이터 기반 금융 솔루션
- 고객 개인의 요구에 맞춘 정교한 경험
- 전문가/코치가 고객의 성장과 성취를 돕는 구조
- 고객이 복잡한 금융 절차보다 결과와 목표를 이해하도록 지원
- 금융상품 나열보다 고객의 삶과 목표를 중심에 둔 경험

이를 모바일 UI 원칙으로 변환한다.

1. 기능명보다 고객 목표를 먼저 표현한다.
2. 시스템 상태보다 사용자가 지금 할 수 있는 행동을 보여준다.
3. 기술 세부사항은 화면에서 제거한다.
4. 중요한 금액, 수익률, 목표 달성 가능성이 시각적 중심이 된다.
5. 설명은 짧고 쉬운 문장으로 쓴다.
6. 오렌지는 브랜드 포인트이지 화면 전체 배경색이 아니다.
7. 금융 정보가 많아져도 카드와 색을 과도하게 늘리지 않는다.
8. 전문성은 어두운 배경이나 복잡성으로 표현하지 않고, 정돈된 정보 위계로 표현한다.

## 2.2 한화 브랜드 컬러 참고

한화 공식 Brand System Guide에서 확인되는 대표색을 참고한다.

- Hanwha Orange: `RGB 243, 115, 33` → `#F37321`
- Navy: `RGB 29, 30, 55` → `#1D1E37`
- Light Navy: `RGB 53, 57, 104` → `#353968`
- Turquoise: `RGB 92, 118, 135` → `#5C7687`
- Sand: `RGB 199, 187, 159` → `#C7BB9F`
- Light Grey: `RGB 239, 238, 232` → `#EFEEE8`

단, 공식 심벌 색상 규칙을 그대로 복제하는 것이 아니다. 앱에서는 이 색을 **PLUS 계열의 인상을 만드는 참고 팔레트**로 사용한다.

## 2.3 PLUS 스타일 구현 결론

최종 모바일 스타일은 아래 비율을 지킨다.

- White/Off-white/Neutral: 화면의 약 80~90%
- Black/Deep Navy typography와 CTA: 약 8~15%
- Hanwha Orange: 약 5~10% 이내
- Soft Blue/Sand/Peach: 정보 구분이 필요한 곳에 제한적으로 사용
- 상승/하락 색상은 브랜드색과 분리

오렌지를 모든 CTA, 카드, 텍스트에 반복 사용하지 않는다.

---

# 3. 작업 범위

## 3.1 반드시 구현

- Light-first 디자인으로 전체 모바일 UI 전환
- 공통 Design Token 구축
- 공통 UI Component 구축
- 기존 사용자 화면을 공통 Component로 마이그레이션
- 모든 사용자 노출 개발자용 용어 제거
- 설정 화면의 개발자 도구 UI 제거
- 상단 수동 탭을 Expo Router 기반 하단 탭으로 전환
- 금융 숫자 강조
- 자산 차트 고도화
- 자산 배분 차트 고도화
- 시뮬레이션 범위 차트 고도화
- 신규 종목 검색/상세/시세 차트 화면에 동일 디자인 시스템 적용
- 오류·빈 화면·로딩·stale 상태 디자인 통일
- 접근성 라벨의 고객 언어 전환
- 테스트 수정
- 하드코딩 색상 재발 방지 검사 추가
- 사용자 노출 금액에 tabular number 적용
- Reduce Motion 지원 유지

## 3.2 있으면 좋은 것

- Skeleton Loading
- Chart press tooltip
- chart 선택 지점 crosshair
- 화면 전환의 짧고 절제된 animation
- 주문 견적 유효시간 countdown
- 최근 조회 종목 UI. 단, 실제 저장 기능이 있을 때만 노출
- 투자 성향 저장 완료 toast/snackbar. 신규 무거운 라이브러리보다 간단한 공통 Notice 사용

## 3.3 이번 작업에서 제외

- 한화/PLUS 로고 및 브랜드 자산 복제
- 실제 한화 서비스 명칭 사용
- Dark mode
- Candlestick/OHLC 차트 신규 구현
- 거래량 보조 차트 신규 구현
- 실시간 WebSocket 시세
- 관심종목 기능을 UI만 만들어 가짜로 노출
- 실제 계좌/주문으로 오해하게 만드는 표현
- 백엔드 API 계약 변경
- DB migration 변경
- KIS credential 및 provider 로직 변경
- 인증 구조 변경
- TanStack Query/Zustand 역할 변경
- 새 상태관리 라이브러리 도입
- 모든 화면에 animation을 넣는 장식성 작업
- 기술 문서를 무작정 고객 언어로 바꾸는 작업. 고객 UI와 내부 기술 문서를 구분한다.

---

# 4. 작업 전 필수 점검

Codex는 가장 먼저 아래 명령으로 작업 상태를 확인한다.

```bash
git status --short
git branch --show-current
find apps/mobile/src -type f | sort
find apps/mobile/src -type f \( -iname '*market*' -o -iname '*stock*' -o -iname '*quote*' -o -iname '*instrument*' \) | sort
rg -n "샌드박스|Sandbox|sandbox|synthetic|테스트 데이터|데이터셋|dataset|PKCE|OIDC|SecureStore|access token|refresh token|계산 엔진|engineVersion|contract|플랫폼 상태|개발자 도구|자동 재시도|서버 저장 결과" apps/mobile/src apps/mobile/app.json
```

### 작업 보호 규칙

- 사용자가 구현 중인 종목 화면 관련 modified/untracked 파일을 우선 읽는다.
- 파일명이 이 문서의 예상 경로와 다르면 현재 구조를 우선한다.
- 새 종목 화면의 query/hook/model/API 로직을 삭제하거나 다시 만들지 않는다.
- UI layer만 디자인 시스템에 맞게 마이그레이션한다.
- 사용자의 변경사항을 `git checkout`, `git restore`, `git reset`, `git clean`으로 제거하지 않는다.
- `.env.local`은 이번 디자인 작업에서 수정하지 않는다.
- 코드 변경 전 현재 테스트 실패 여부를 기록한다.

---

# 5. 사용자 노출 브랜드명

현재 `Wealth Sandbox`, `자산 샌드박스`는 모두 제거한다.

임시 독립 브랜드명은 다음으로 통일한다.

```text
Wealth Flow
```

한국어 문장에서는 필요할 때만 `Wealth Flow`를 사용하고, 매 화면마다 브랜드명을 반복하지 않는다.

브랜드명을 한 곳에서 교체할 수 있도록 다음 파일을 만든다.

```text
apps/mobile/src/shared/design-system/brand/app-brand.ts
```

예시:

```ts
export const APP_BRAND = {
  displayName: 'Wealth Flow',
  shortName: 'Wealth',
} as const;
```

실제 한화, PLUS, PLUS 파이, 한화생명, 한화투자증권 명칭을 앱 브랜드로 사용하지 않는다.

---

# 6. 고객 언어 전환 정책

## 6.1 핵심 원칙

- 개발팀이 이해하는 표현과 고객이 이해하는 표현을 분리한다.
- 내부 enum, API error code, class name은 유지한다.
- 화면에 보여줄 때만 `displayLabel`, customer copy mapper를 통해 변환한다.
- 사용자 화면에서 영어 대문자 eyebrow를 남발하지 않는다.
- 화면의 모든 disclaimer를 오렌지색으로 반복 노출하지 않는다.
- 예시 데이터 고지는 숨기지 않되, 고객이 이해할 수 있는 한두 개의 안내로 통합한다.

## 6.2 금지하는 사용자 노출 용어

다음 문자열은 고객 화면, 버튼, 접근성 라벨, 앱 이름에서 제거한다.

```text
샌드박스
Sandbox
Synthetic
합성 데이터
테스트 사용자
데이터셋 / dataset
contract / contract version
platform-v1
플랫폼 상태
PKCE
OIDC
SecureStore
access token
refresh token
서버 저장 결과
계산 엔진 / engine version
자동 재시도 없음
Idempotency / 멱등성
provider
개발자 도구
시나리오 적용
테스트 데이터 초기화
local session
mock
```

단, 테스트 파일명, 내부 타입명, API module, 기술 문서에는 유지할 수 있다.

## 6.3 정확성을 유지하는 예시 데이터 안내

계좌·자산·주문 데이터가 예시라는 사실은 고객 친화적으로 다음처럼 안내한다.

### 앱 공통 안내

```text
계좌·자산·주문 정보는 포트폴리오 시연을 위한 예시입니다.
실제 금융계좌와 연결되지 않습니다.
```

### 주문 화면 안내

```text
이 주문은 포트폴리오 시연용이며 실제 거래는 발생하지 않습니다.
```

### 시뮬레이션 안내

```text
예상 결과는 입력값과 가정에 따른 참고 정보이며 실제 수익을 보장하지 않습니다.
```

### 실제 KIS 종목 시세 화면 안내

계좌 데이터와 달리 KIS 시세는 실제 provider 연동 결과일 수 있으므로 다음처럼 구분한다.

```text
시세는 제공처의 수집 시각을 기준으로 하며 지연될 수 있습니다.
```

공통 화면에서 “모든 시세가 예시”라고 단정하지 않는다.

## 6.4 기존 문구 → 고객 문구 치환표

| 기존 표현 | 변경 표현 |
|---|---|
| 자산 샌드박스 · 대시보드 | 삭제 |
| 자산 샌드박스 | Wealth Flow |
| 안전한 자산관리 샌드박스에 로그인 | 내 자산의 흐름을 한눈에 |
| 브라우저로 로그인 | 로그인 |
| 테스트 로그인 | 로그인 |
| 보안 인증 · PKCE 방식 | 안전하게 보호되는 로그인 |
| 앱에는 클라이언트 비밀값을 두지 않으며… | 로그인 정보는 안전하게 보호됩니다. |
| 테스트 금융 데이터 · 실제 금융서비스가 아닙니다 | 포트폴리오 시연용 앱입니다 |
| 보안 세션을 확인하고 있습니다 | 로그인 정보를 확인하고 있어요 |
| 앱이 잠겨 있습니다 | 다시 확인해 주세요 |
| 서버 MFA가 아닙니다 | 생체정보는 기기에서만 확인되며 서버에 저장되지 않습니다 |
| 기관 연결 · 상태 | 연결된 금융기관 |
| 마지막 동기화 | 최근 업데이트 |
| 지금 동기화 | 자산 정보 업데이트 |
| 동기화 전 데이터 | 업데이트가 필요해요 |
| 동기화 COMPLETED | 자산 정보를 업데이트했어요 |
| 테스트 기관만 연결됩니다 | 연결할 금융기관을 선택해 주세요 |
| 재현 가능한 데이터 · 버전 1 | 삭제 |
| 자산 시뮬레이션 | 목표 자산 미리보기 |
| 시뮬레이션 실행 | 결과 보기 |
| 서버 저장 결과 | 예상 결과 |
| 목표 달성 확률 | 목표 달성 가능성 |
| 계산 엔진 / 기준 데이터셋 | 사용자 화면에서 제거 |
| 고정 배분 | 기본 자산 배분 |
| 매수 주문 · 자동 재시도 없음 | 주문 전 정보를 확인해 주세요 |
| 견적 확인 | 가격 확인 |
| 60초 견적 | 주문 예상금액 |
| 생체인증 후 매수 확정 | 생체인증 후 주문 |
| 결과 확인 중입니다. POST 재전송 없이… | 주문 처리 결과를 확인하고 있어요 |
| 데이터 정보 | 내 정보 |
| 투자 성향 정보 | 투자 성향 |
| 개인정보 보호 | 화면 보안 |
| 현재 세션 로그아웃 | 로그아웃 |
| 개발자 도구 | 화면에서 제거 |
| 데이터셋 버전 | 화면에서 제거 |
| 시나리오 NORMAL/TIMEOUT 등 | 화면에서 제거 |
| 테스트 데이터 초기화 | 화면에서 제거 |
| FRESH | 최신 정보 |
| STALE | 지연된 정보 |
| UNKNOWN 주문 상태 | 확인 중 |
| ACCEPTED/PENDING | 접수됨 |
| FILLED | 주문 완료 |
| REJECTED | 주문 거절 |
| FAILED | 처리 실패 |
| KIS | 한국투자증권 제공 |

---

# 7. 디자인 시스템 폴더 구조

아래 구조를 새로 만든다.

```text
apps/mobile/src/shared/design-system/
├── brand/
│   └── app-brand.ts
├── tokens/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── radius.ts
│   ├── shadows.ts
│   ├── motion.ts
│   └── index.ts
├── components/
│   ├── app-text.tsx
│   ├── screen.tsx
│   ├── page-header.tsx
│   ├── card.tsx
│   ├── button.tsx
│   ├── icon-button.tsx
│   ├── text-field.tsx
│   ├── search-field.tsx
│   ├── money-value.tsx
│   ├── metric-value.tsx
│   ├── market-change.tsx
│   ├── section-header.tsx
│   ├── list-row.tsx
│   ├── status-chip.tsx
│   ├── notice-banner.tsx
│   ├── loading-state.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── segmented-control.tsx
│   ├── demo-disclosure.tsx
│   └── index.ts
├── charts/
│   ├── chart-theme.ts
│   ├── chart-card.tsx
│   ├── asset-trend-chart.tsx
│   ├── allocation-donut-chart.tsx
│   ├── simulation-range-chart.tsx
│   ├── market-price-chart.tsx
│   └── index.ts
└── index.ts
```

실제 저장소에 이미 비슷한 폴더가 구현되어 있으면 중복 생성하지 말고 통합한다.

---

# 8. Design Tokens

## 8.1 Color primitive

`tokens/colors.ts`에 primitive와 semantic token을 분리한다.

```ts
export const palette = {
  white: '#FFFFFF',
  black: '#111111',

  orange500: '#F37321',
  orange300: '#F89B6C',
  orange200: '#FBB584',
  orange100: '#FFE2CF',
  orange50: '#FFF3EA',
  orangeText: '#9A3B08',

  navy900: '#1D1E37',
  navy700: '#353968',
  turquoise600: '#5C7687',
  sand500: '#C7BB9F',
  warmGrey200: '#EFEEE8',

  neutral950: '#151515',
  neutral900: '#1F1F1F',
  neutral800: '#303238',
  neutral700: '#4C5058',
  neutral600: '#62666F',
  neutral500: '#858A94',
  neutral400: '#A7ABB3',
  neutral300: '#D2D5DA',
  neutral200: '#E5E6E9',
  neutral150: '#ECEDEA',
  neutral100: '#F3F4F3',
  neutral50: '#F8F8F6',

  info600: '#456B7C',
  info100: '#DDE9EE',
  info50: '#EFF5F7',

  success600: '#187A58',
  success50: '#EAF6F0',
  warning700: '#9B6200',
  warning50: '#FFF5DD',
  danger600: '#C63D3D',
  danger50: '#FDEDED',

  marketUp: '#D64545',
  marketUpSoft: '#FDECEC',
  marketDown: '#3568D4',
  marketDownSoft: '#EDF2FE',
  marketFlat: '#747982',
} as const;
```

## 8.2 Semantic colors

```ts
export const colors = {
  background: {
    screen: palette.neutral50,
    elevated: palette.white,
    inverse: palette.neutral950,
  },
  surface: {
    primary: palette.white,
    subtle: palette.neutral100,
    warm: palette.orange50,
    info: palette.info50,
    success: palette.success50,
    warning: palette.warning50,
    danger: palette.danger50,
  },
  text: {
    primary: palette.neutral950,
    secondary: palette.neutral600,
    tertiary: palette.neutral500,
    inverse: palette.white,
    brand: palette.orangeText,
    success: palette.success600,
    warning: palette.warning700,
    danger: palette.danger600,
  },
  border: {
    subtle: palette.neutral200,
    strong: palette.neutral300,
    focus: palette.orange500,
  },
  action: {
    primaryBackground: palette.neutral950,
    primaryText: palette.white,
    secondaryBackground: palette.white,
    secondaryText: palette.neutral950,
    brandBackground: palette.orange500,
    brandText: palette.neutral950,
    disabledBackground: palette.neutral200,
    disabledText: palette.neutral500,
  },
  brand: {
    primary: palette.orange500,
    soft: palette.orange50,
    navy: palette.navy900,
    lightNavy: palette.navy700,
    turquoise: palette.turquoise600,
    sand: palette.sand500,
  },
  market: {
    up: palette.marketUp,
    upSoft: palette.marketUpSoft,
    down: palette.marketDown,
    downSoft: palette.marketDownSoft,
    flat: palette.marketFlat,
  },
} as const;
```

### 색상 사용 규칙

- `#F37321`은 장식, 활성 indicator, chart point, 브랜드 마크, 추천/강조 영역에 사용한다.
- 작은 본문 텍스트를 순수 오렌지로 표시하지 않는다. 대비가 필요한 텍스트에는 `orangeText`를 사용한다.
- Primary CTA는 기본적으로 Black background + White text다.
- 오렌지 전체 버튼은 한 화면에 최대 하나이며 특별 강조가 필요할 때만 쓴다.
- 상승은 Red, 하락은 Blue로 표시한다.
- 성공 상태 Green과 상승 Red를 혼용하지 않는다.
- 카드마다 다른 색을 붙여 알록달록하게 만들지 않는다.
- 그림자는 최소화하고 border와 surface 차이로 계층을 만든다.

---

# 9. Typography

별도 폰트 파일을 추가하지 않는다. iOS/Android 기본 시스템 폰트를 사용한다.

숫자에는 반드시 다음을 적용한다.

```ts
fontVariant: ['tabular-nums']
```

## 9.1 Typography token

```ts
export const typography = {
  display: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  amountHero: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.9,
    fontVariant: ['tabular-nums'],
  },
  title1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  title2: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  legal: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '400',
  },
} as const;
```

### Typography 규칙

- 11px는 법적 안내/출처처럼 정말 부차적인 정보에만 사용한다.
- 화면 제목은 28px를 기본으로 한다.
- 총자산, 현재가, 목표 달성 가능성은 32~36px로 강조한다.
- 카드 제목과 본문 사이에 weight 차이를 명확히 둔다.
- 영어 대문자 + 큰 letter spacing을 eyebrow로 반복하지 않는다.
- 금액은 통화 단위와 숫자의 크기 차이를 둘 수 있으나 한 줄 기준선을 유지한다.
- 금액 숨김 상태에서도 레이아웃 폭이 크게 흔들리지 않게 한다.

---

# 10. Spacing, Radius, Shadow, Motion

## 10.1 Spacing

```ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
```

- 화면 좌우 기본 여백: 20
- section 간격: 32
- card 내부 여백: 20
- list row 최소 높이: 56
- 주요 버튼 높이: 52
- icon button 최소 touch target: 44

## 10.2 Radius

```ts
export const radius = {
  small: 8,
  input: 12,
  button: 14,
  card: 20,
  largeCard: 24,
  full: 999,
} as const;
```

모든 카드에 22, 18, 16을 화면별로 임의 지정하지 않는다.

## 10.3 Shadow

- 기본 Card는 shadow 없이 border 사용
- Floating bottom action 또는 modal에만 매우 약한 shadow
- Android elevation 남용 금지
- dark navy glow, neon shadow 제거

## 10.4 Motion

```ts
export const motion = {
  fast: 160,
  normal: 240,
  slow: 360,
  chart: 500,
} as const;
```

- `useReducedMotion()`이 true면 chart와 숫자 transition을 생략한다.
- 눌림 상태는 opacity 또는 scale 0.98 정도로 제한한다.
- 무한 pulse/glow animation 금지
- 화면 정보가 바뀔 때 layout jump를 줄이는 데 animation을 사용한다.

---

# 11. 공통 Component 명세

## 11.1 `AppText`

지원 variant:

```text
display
amountHero
title1
title2
heading
body
bodyStrong
label
caption
legal
```

지원 tone:

```text
primary
secondary
tertiary
inverse
brand
success
warning
danger
marketUp
marketDown
```

화면 파일에서 `fontSize`, `fontWeight`, `lineHeight`, 주요 text color를 직접 지정하지 않는다.

## 11.2 `Screen`

기존 각 화면의 다음 반복 구조를 대체한다.

```tsx
<SafeAreaView>
  <ScrollView contentContainerStyle={...}>
```

필수 props 예시:

```ts
type ScreenProps = {
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
  children: ReactNode;
};
```

- background는 `colors.background.screen`
- 기본 horizontal padding 20
- 기본 top padding 20~24
- bottom tab이 있는 경우 안전한 하단 여백 제공
- `showsVerticalScrollIndicator={false}` 기본

## 11.3 `PageHeader`

- title
- optional greeting/subtitle
- optional right action
- eyebrow는 기본 사용하지 않는다.
- title과 subtitle 사이 간격을 token으로 통일한다.

## 11.4 `Card`

variant:

```text
default
subtle
warm
info
warning
danger
```

- default: white + subtle border
- warm: soft orange background
- info: pale blue background
- border와 shadow를 동시에 과하게 쓰지 않는다.

## 11.5 `Button`

variant:

```text
primary
secondary
brand
destructive
ghost
```

size:

```text
large
medium
small
```

상태:

```text
default
pressed
disabled
loading
```

기존 각 화면의 `Action`, `primary`, `secondary`, `saveButton`, `retryButton`, `logout` 스타일을 모두 대체한다.

## 11.6 `TextField`

- label
- value
- helperText
- errorText
- keyboardType
- optional leading/trailing icon
- focus border orange
- 기본 높이 52
- background white
- error 상태는 red border와 고객 문구

## 11.7 `SearchField`

종목 화면 전용으로 사용한다.

- placeholder: `종목명 또는 종목코드 검색`
- clear action
- submit/search icon
- debounce 로직은 기존 hook/model에서 처리
- UI component가 API를 직접 호출하지 않는다.

## 11.8 `MoneyValue`

예시 interface:

```ts
type MoneyValueProps = {
  value: string | number;
  hidden?: boolean;
  size?: 'hero' | 'large' | 'medium' | 'small';
  currency?: 'KRW' | 'USD';
  signed?: boolean;
  tone?: 'primary' | 'marketUp' | 'marketDown' | 'muted';
  accessibilityLabel?: string;
};
```

- 기존 `formatWon()`과 privacy store를 재사용한다.
- 숫자는 tabular.
- 자산, 주문 예상금액, 현재가, 시뮬레이션 결과에 공통 사용한다.
- 숨김 상태를 Component 내부에서 일관되게 처리한다.

## 11.9 `MetricValue`

금액이 아닌 다음 수치에 사용한다.

- 목표 달성 가능성
- 수익률
- 거래량
- 투자 비중
- 기간

## 11.10 `MarketChange`

- positive → Red
- negative → Blue
- zero → Neutral
- `+1,200원 (+1.64%)`를 한 줄로 표현
- accessibility label에 상승/하락을 말로 포함

## 11.11 `SectionHeader`

- title
- optional action label
- section마다 임의 font size를 만들지 않는다.

## 11.12 `ListRow`

- leading
- title
- description
- trailing
- onPress
- divider
- selected
- 계좌, 보유상품, 거래, 주문내역, 종목 검색 결과에 사용한다.

## 11.13 `StatusChip`

- 연결됨
- 업데이트 필요
- 접수됨
- 확인 중
- 완료
- 거절됨
- 최신 정보
- 지연된 정보

내부 enum을 그대로 노출하지 않는다.

## 11.14 상태 Component

다음을 공통 구현한다.

```text
LoadingState
EmptyState
ErrorState
NoticeBanner
```

각 화면마다 중앙 정렬, 색상, 문구 스타일을 반복 정의하지 않는다.

## 11.15 `SegmentedControl`

다음에 공통 사용한다.

- 투자 성향
- 종목 차트 기간
- 필요 시 자산 차트 기간
- 시뮬레이션 옵션

선택 상태는 background 또는 underline 한 가지 방식으로 통일한다.

## 11.16 `DemoDisclosure`

고객 화면에 반복 경고를 뿌리지 않고 다음 위치에 제한적으로 사용한다.

- 내 정보 > 서비스 안내
- 주문 확인 영역
- 시뮬레이션 결과 하단

---

# 12. 내비게이션 구조 변경

## 12.1 현재 문제

현재 `apps/mobile/src/app/index.tsx`는 local `useState`로 상단 탭을 전환한다.

```text
자산 / 주문 / 시뮬레이션 / 설정
```

이 구조는 다음 문제가 있다.

- route history가 없다.
- deep link가 어렵다.
- 선택 탭 시각 상태가 약하다.
- 신규 종목 화면이 추가되면 탭 수와 너비가 과도해진다.
- 고객 앱보다 내부 데모 페이지처럼 보인다.

## 12.2 목표 구조

Bottom Tabs:

```text
홈
종목
플랜
내 정보
```

주문은 Bottom Tab에서 제거하고 contextual stack route로 이동한다.

```text
홈 또는 종목 상세
  → 주문 화면
  → 주문 결과
```

### 목표 Route 예시

```text
apps/mobile/src/app/
├── _layout.tsx
├── index.tsx
├── oauth/
│   └── callback.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── market.tsx
│   ├── plan.tsx
│   └── me.tsx
├── market/
│   └── [symbol].tsx
└── order.tsx
```

실제 신규 종목 화면 구현 경로가 다르면 현재 구조를 존중하되 최종 사용자 route는 동일한 의미를 갖도록 한다.

### 탭 역할

| 탭 | 화면 |
|---|---|
| 홈 | WealthDashboardScreen |
| 종목 | 신규 Stock/Market Search Screen |
| 플랜 | SimulationScreen |
| 내 정보 | SettingsScreen을 고객용 MyScreen으로 전환 |

### 주문 Route

- 기존 `OrderScreen`의 business logic을 보존한다.
- top-level tab이 아니라 modal 또는 stack screen으로 연다.
- 기존 테스트나 demo flow에서 직접 접근할 수 있는 route는 유지할 수 있다.
- 실제 selected symbol/account 전달이 아직 구현되지 않았다면 가짜 CTA를 만들지 않는다.

## 12.3 구현 파일

### `apps/mobile/src/app/_layout.tsx`

- Provider 순서는 보존
- `StatusBar style="light"`를 light theme에 맞게 `dark`로 변경
- root background를 디자인 token으로 지정
- Stack content background 통일

### `apps/mobile/src/app/index.tsx`

- 수동 tab state와 상단 tab bar 제거
- `(tabs)`로 Redirect하거나 Home route wrapper로 축소

### 신규 `apps/mobile/src/app/(tabs)/_layout.tsx`

- Expo Router `Tabs` 사용
- icon은 하나의 icon set으로 통일
- 활성 아이콘/indicator에 orange
- 비활성 아이콘/label은 neutral
- tab bar background white
- top border subtle
- 높이와 safe-area 대응
- 긴 `시뮬레이션` 대신 `플랜`
- `시장`보다 고객 행동 중심인 `종목` 사용

---

# 13. 파일별 변경 지시

## 13.1 `apps/mobile/src/app/_layout.tsx`

현재 provider composition은 유지한다.

변경:

- design-system theme import
- StatusBar dark
- Stack background light
- 필요 시 route presentation 설정
- App Lock/Login 화면도 같은 light token 사용

금지:

- Provider 순서 임의 변경
- Auth session logic 변경
- Query client 재생성
- AppLockBoundary 제거

---

## 13.2 `apps/mobile/src/app/index.tsx`

제거:

- `section` local state
- 상단 4개 tab Pressable
- `#07111f`, `#101d2e`, `#22334a`
- 직접 렌더링 분기

대체:

- Expo Router tabs route
- home redirect 또는 wrapper

현재 파일이 신규 종목 구현으로 수정되어 있다면 먼저 merge 구조를 확인하고 사용자의 변경을 보존한다.

---

## 13.3 `apps/mobile/src/features/login/ui/oidc-login-screen.tsx`

공통 Component 치환:

| 현재 | 변경 |
|---|---|
| SafeAreaView + View | Screen scroll=false |
| Text title | AppText title1/display |
| securityCard | Card variant=info |
| loginButton | Button variant=primary |
| errorText/noticeText | NoticeBanner |
| brandMark | 독립 BrandMark 또는 orange dot |
| syntheticNotice | DemoDisclosure 또는 간단 footer |

문구:

```text
WEALTH FLOW

내 자산의 흐름을
한눈에 확인하세요

흩어진 자산을 연결하고
목표에 맞는 계획을 확인해 보세요.

안전하게 보호되는 로그인
로그인 정보는 안전하게 보호됩니다.

[ 로그인 ]
```

local test login mode에서도 사용자에게 `테스트 로그인`이라고 표시하지 않는다. 내부 구현만 test client를 사용한다.

`OidcConfigurationScreen`은 실제 고객에게 노출되는 환경이라면:

- 제목: `로그인 준비가 완료되지 않았습니다`
- 설명: `서비스 연결 상태를 확인한 뒤 다시 시도해 주세요.`
- issuer/client ID 목록은 고객에게 노출하지 않는다.
- 개발 빌드에서만 세부 진단을 console/log에 남긴다.

---

## 13.4 `apps/mobile/src/features/app-lock/ui/app-lock-boundary.tsx`

치환:

| 현재 | 변경 |
|---|---|
| dark SafeArea | Screen light |
| lockMark neon mint | soft orange circular icon container |
| primaryButton | Button primary |
| failureText | NoticeBanner danger |
| description | AppText body secondary |

문구:

```text
다시 확인해 주세요

자산 정보를 안전하게 보호하기 위해
생체인증이 필요합니다.

생체정보는 기기에서만 확인되며
서버에 저장되지 않습니다.

[ 잠금 해제 ]
```

재로그인 필요 상태:

```text
로그인이 필요합니다
안전한 이용을 위해 다시 로그인해 주세요.
[ 로그인으로 이동 ]
```

`서버 MFA가 아니다`, `로컬 세션 종료` 같은 기술 표현을 제거한다.

---

## 13.5 `apps/mobile/src/features/health/ui/health-screen.tsx`

먼저 사용처를 찾는다.

```bash
rg -n "HealthScreen|ChartSmoke" apps/mobile/src
```

### customer route에서 사용하지 않는 경우

- `HealthScreen`을 제품 화면에서 제거한다.
- UI 테스트도 삭제하거나 service health hook/query test로 대체한다.
- `ChartSmoke`는 차트 호환성 테스트용이라면 UI feature가 아닌 test fixture/helper로 이동한다.
- 고객 앱에 플랫폼 상태, contract version, dataset version, chart stack을 노출하지 않는다.

### 정말 customer boot flow에 필요한 경우

다음 한 화면으로 단순화한다.

```text
서비스를 준비하고 있어요
잠시만 기다려 주세요.
```

오류:

```text
서비스에 연결하지 못했습니다
네트워크 상태를 확인한 뒤 다시 시도해 주세요.
[ 다시 시도 ]
```

버전, dataset, Victory/Skia/Reanimated 명칭은 제거한다.

---

## 13.6 `apps/mobile/src/features/identity/ui/current-user-screen.tsx`

먼저 실제 route 사용 여부를 확인한다.

- 별도 route에서 사용하지 않으면 Settings/My에 필요한 display name만 통합하고 screen 제거
- 내부 current-user query와 hook은 유지
- dataset version, token, auth 기술 설명 제거
- 고객 화면 제목은 `내 정보`
- `인증된 사용자 연결` 같은 설명 제거
- `테스트 사용자 A`가 seed 값이면 자연스러운 예시 이름으로 교체 가능하나 API 계약은 변경하지 않는다.

---

## 13.7 `apps/mobile/src/features/wealth/ui/wealth-dashboard-screen.tsx`

### 화면 구조 목표

```text
안녕하세요, {이름}님

총 자산
184,320,000원
현금 44,720,000원 · 투자자산 139,600,000원
[금액 숨김 아이콘]

[자산 추이 Line/Area Chart]

자산 구성
[Donut Chart + legend]

연결된 금융기관
최근 업데이트 9월 2일 오후 7:30
[자산 정보 업데이트]

계좌
[계좌 rows]

최근 거래
[거래 rows]
```

### 공통 Component 치환

| 현재 코드 | 변경 |
|---|---|
| 내부 `Action` component | 공통 Button |
| `styles.card` | Card |
| `styles.detail` | Card variant=subtle |
| `styles.warningCard` | NoticeBanner warning |
| `styles.errorBanner` | NoticeBanner danger |
| `styles.total`, `styles.amount` | MoneyValue |
| `styles.row` | ListRow |
| `styles.sectionTitle` | SectionHeader / AppText heading |
| pending/error center | LoadingState / ErrorState |
| repeated disclaimer | 화면에서 제거하고 My의 DemoDisclosure로 통합 |

### 중요 디자인 변경

- `자산 현황` 제목보다 `총 자산` 숫자가 먼저 보이게 한다.
- 총자산은 최소 34px.
- `총 자산 · 날짜`처럼 한 줄에 기술적인 메타를 섞지 않는다.
- 기준일은 금액 아래 작은 caption으로 표시한다.
- 연결/동기화 카드를 첫 카드로 두지 않는다. 자산 결과가 먼저다.
- 연결이 없을 때만 연결 empty state를 hero 다음에 노출한다.
- partial error는 화면 전체를 막지 않고 pale warning banner로 표시한다.
- `동기화 계좌 1 / 보유 4 / 거래 10` 같은 처리 건수는 고객 화면에서 제거한다.
- 금액 숨김 action은 total amount 옆 icon button으로 이동한다.
- Account detail은 별도 route가 가능하면 route로 이동한다. 이번 범위에서 어렵다면 expandable card로 유지하되 디자인 시스템 사용.

---

## 13.8 `apps/mobile/src/features/wealth/ui/asset-charts.tsx`

현재 View 높이 기반 bar chart를 최종 제품 차트로 사용하지 않는다.

파일 선택:

- 이 파일을 composition wrapper로 유지하거나
- `shared/design-system/charts`로 기능을 분리하고 기존 파일을 삭제

최종 구성:

```tsx
<AssetTrendChart history={history} hidden={amountsHidden} />
<AllocationDonutChart allocation={allocation} hidden={amountsHidden} />
```

자세한 요구사항은 후술한 Chart section을 따른다.

---

## 13.9 `apps/mobile/src/features/simulation/ui/simulation-screen.tsx`

### 화면명 변경

- 탭: `플랜`
- 화면 제목: `목표 자산 미리보기`
- 설명: `기간과 납입 금액을 바꾸며 예상 자산 범위를 확인해 보세요.`

### 구조

```text
목표 자산 미리보기
기간과 납입 금액을 바꾸며 예상 범위를 확인해 보세요.

[시작 자산]
[월 납입액]
[기간]
[목표 금액]

기본 자산 배분
현금 10% / 채권 30% / 주식 60%
[segmented allocation bar]

[ 결과 보기 ]

예상 결과

목표 달성 가능성
71%

예상 중앙 자산
426,300,000원

[보수적~기대 범위 Chart]

예상 결과는 입력값과 가정에 따른 참고 정보이며
실제 수익을 보장하지 않습니다.
```

### 치환

- `styles.card` → Card
- `TextInput` → TextField
- `styles.action` → Button primary
- `styles.probability` → MetricValue hero
- `formatWon p50` → MoneyValue
- `errorCard` → ErrorState 또는 NoticeBanner
- `loading` → LoadingState
- `version`, engineVersion, assumptionSetVersion → 고객 화면에서 제거
- raw p10/p50/p90 용어 → `보수적 / 기준 / 기대`

Zustand draft store와 TanStack Query mutation은 그대로 유지한다.

---

## 13.10 `apps/mobile/src/features/simulation/ui/percentile-chart.tsx`

현재 6개 샘플 × p10/p50/p90 막대차트를 제거한다.

다음으로 대체한다.

```text
SimulationRangeChart
- p10~p90 confidence band
- p50 central line
- press tooltip
- x축 기간
- y축 compact won
- legend: 보수적 / 기준 / 기대
```

파일명은 유지할 수 있지만 export는 `SimulationRangeChart`를 사용하도록 정리한다.

구현 시 설치된 `victory-native@42.0.0` API와 타입을 실제로 확인한다.

- `Area` 또는 range area가 지원되면 사용
- 직접적인 range band가 어렵다면 Skia Path로 p90 forward + p10 reverse polygon을 만들어 fill
- p50은 `Line`
- data point는 memoization
- selected point tooltip 제공
- Reduce Motion 적용
- 접근성 label은 전체 chart 요약 + 선택 point 값 제공
- 100개 이상의 individual accessibility node를 만들지 않는다.

---

## 13.11 `apps/mobile/src/features/order/ui/order-screen.tsx`

### 화면 구조

```text
매수 주문

주문 대상
삼성전자
005930 · 코스피

수량
[ 1 ]

[ 가격 확인 ]

주문 예상금액
74,200원
현재가 74,200원
유효시간 00:54

[ 생체인증 후 주문 ]

주문 상태
접수됨 / 확인 중 / 주문 완료 / 주문 거절

최근 주문
...
```

### 치환

- card → Card
- input → TextField
- primary/secondary → Button
- amount/value → MoneyValue / AppText
- error/warning → NoticeBanner
- row → ListRow
- status raw enum → StatusChip
- disclaimer는 주문 확인 Card 하단의 `DemoDisclosure`

### 문구 변환

- `자동 재시도 없음` 제거
- `POST 재전송 없이 상태만 조회` 제거
- `IDEMPOTENCY_CONFLICT`:
  - `이미 접수된 주문과 내용이 달라 처리하지 않았습니다. 주문 내역을 확인해 주세요.`
- `QUOTE_EXPIRED`:
  - `가격 확인 시간이 지났습니다. 최신 가격을 다시 확인해 주세요.`
- `UNKNOWN`:
  - `주문 처리 결과를 확인하고 있어요.`
- `FAILED/REJECTED`:
  - `주문이 완료되지 않았습니다. 주문 내역을 확인해 주세요.`

기술적으로 POST 자동 재시도를 하지 않는 기존 정책은 유지하되 사용자 설명에서 구현 세부를 제거한다.

---

## 13.12 `apps/mobile/src/features/settings/ui/settings-screen.tsx`

이 화면은 고객용 `내 정보` 화면으로 바꾼다.

### 반드시 제거

- `SCENARIOS`
- developerToolsEnabled 기반 개발자 카드
- scenario mutation UI
- reset dataset UI
- dataset version 노출
- `개발자 도구`
- `시나리오 정상/timeout/500`
- `테스트 데이터 초기화`
- technical status message

backend developer/simulator API와 CLI script는 그대로 둘 수 있다. 단 모바일 고객 UI에서 호출하지 않는다.

### 목표 구조

```text
내 정보

{사용자 이름}

투자 성향
안정형 / 균형형 / 성장형
투자 기간
월 납입액
[ 저장 ]

화면 보안
금액 숨기기 [Switch]

서비스 안내
계좌·자산·주문 정보는 포트폴리오 시연을 위한 예시입니다.
실제 금융계좌와 연결되지 않습니다.
종목 시세는 제공처 기준 정보이며 지연될 수 있습니다.

[ 로그아웃 ]
```

### 치환

- risk button group → SegmentedControl
- TextInput → TextField
- saveButton → Button primary
- amount visibility Pressable → React Native Switch 또는 공통 SwitchRow
- card → Card
- logout → Button destructive/secondary
- status message → NoticeBanner success/error

---

## 13.13 `apps/mobile/src/shared/format/display-labels.ts`

내부 enum을 고객 표현으로 변환하는 단일 위치로 사용한다.

추가/수정 대상:

```text
ConnectionStatus
SyncStatus
OrderStatus
Market freshness
Market provider
Risk profile
Asset class
Transaction type
Market code
Simulation percentile label
```

원칙:

- raw enum 문자열이 UI에 직접 노출되지 않게 한다.
- `dataset`, `contract`, engine version display helper는 고객 UI에서 사용하지 않는다.
- 내부 테스트/로그에서만 필요한 helper는 별도 internal formatter로 이동할 수 있다.
- `KIS`는 고객 UI에서 `한국투자증권 제공`으로 표시한다.

---

## 13.14 `apps/mobile/src/shared/format/finance-format.ts`

기존 formatter를 보존하면서 다음 helper를 검토한다.

```ts
formatSignedWon()
formatPercent()
formatSignedPercent()
formatVolume()
formatCompactWon()
formatCapturedAt()
```

규칙:

- 금액은 locale 기반 separator
- percentage 소수 자릿수 통일
- 상승은 `+`, 하락은 `-`
- 숨김 상태를 모든 화면에서 동일 처리
- accessibility용 full wording 지원
- financial calculation은 formatter에서 하지 않는다.

---

## 13.15 `apps/mobile/app.json`

변경:

```json
{
  "name": "Wealth Flow"
}
```

- `userInterfaceStyle`은 이번 작업에서 `"light"`로 고정하는 것을 우선한다.
- iOS/Android status/navigation bar가 light design과 충돌하지 않게 한다.
- 기존 scheme/bundle identifier는 인증 redirect에 연결되어 있으므로 디자인 작업만으로 무작정 변경하지 않는다.
- 사용자에게 보이는 앱 이름만 우선 변경한다.
- 내부 `wealthsandbox` identifier를 바꾸려면 OIDC redirect, Keycloak config, tests를 모두 같이 수정하고 별도 판단을 기록한다.

---

# 14. 신규 종목 조회 화면 적용 지시

사용자가 이 문서 작성 시점에 종목 조회 화면을 별도로 구현 중이다. GitHub main에는 구현계획만 있을 수 있으므로 Codex는 **로컬 working tree의 최신 파일을 기준으로** 처리한다.

## 14.1 먼저 파일 탐색

```bash
find apps/mobile/src -type f \( \
  -iname '*market*' -o \
  -iname '*stock*' -o \
  -iname '*quote*' -o \
  -iname '*instrument*' \
\) | sort

rg -n "MARKET_|market.read|currentPrice|changeRate|capturedAt|freshness|MINUTE|DAILY|WEEKLY|MONTHLY|YEARLY" apps/mobile/src
```

## 14.2 API/Logic 보존

- 검색 query
- debounce
- quote query
- bars query
- interval state
- stale cache
- provider error
- rate limit
- KIS source
- captured time
- TanStack Query key

는 기존 구현을 보존한다.

## 14.3 종목 검색 화면

목표 UI:

```text
종목 찾기

[ 종목명 또는 종목코드 검색 ]

최근 검색 또는 안내 영역
(실제 데이터가 있을 때만)

검색 결과
삼성전자
005930 · 코스피
통신 및 방송 장비 제조업              >
```

### Component

- Screen
- PageHeader
- SearchField
- ListRow
- LoadingState
- EmptyState
- ErrorState
- NoticeBanner

### 상태 문구

Initial:

```text
종목명이나 6자리 종목코드를 검색해 보세요.
```

Loading:

```text
종목을 찾고 있어요.
```

Empty:

```text
검색 결과가 없습니다.
종목명이나 종목코드를 다시 확인해 주세요.
```

Provider unavailable:

```text
종목 정보를 불러오지 못했습니다.
잠시 후 다시 시도해 주세요.
```

Rate limited:

```text
요청이 많아 잠시 쉬고 있어요.
잠시 후 다시 확인해 주세요.
```

## 14.4 종목 상세 화면

목표 구조:

```text
<  삼성전자

005930 · 코스피

74,200원
+1,200원 (+1.64%)

[ Price Line/Area Chart ]

분  일  주  월  년

거래량
12,452,301

최근 수집
9월 2일 오후 7:30

한국투자증권 제공
시세는 수집 시각을 기준으로 하며 지연될 수 있습니다.
```

### 숫자 강조

- 현재가 34~36px
- 등락 정보 15px semibold
- 현재가와 등락이 종목명보다 시각적으로 강해야 한다.
- 상승 Red, 하락 Blue, 보합 Neutral
- Orange를 상승/하락 의미로 사용하지 않는다.

### Interval label

| API | 고객 label |
|---|---|
| MINUTE | 분 |
| DAILY | 일 |
| WEEKLY | 주 |
| MONTHLY | 월 |
| YEARLY | 년 |

### Freshness

| 내부 | 고객 표현 |
|---|---|
| FRESH | 최신 정보 |
| STALE | 지연된 정보 |

STALE일 때 pale warning banner:

```text
현재 최신 시세를 불러오지 못해 최근 정보를 보여드리고 있습니다.
```

## 14.5 종목 차트

`MarketPriceChart`를 공통 chart layer에 구현한다.

- `CartesianChart`
- 종가 line
- soft orange area/gradient
- selected point
- press tooltip
- x축 날짜
- y축 compact price
- line color는 brand orange
- 현재 등락 수치의 red/blue semantic과 chart brand color를 구분
- stale 상태여도 chart 자체는 마지막 성공 데이터를 표시
- 데이터가 2개 미만이면 EmptyState
- null/invalid OHLC를 0으로 바꾸지 않는다.
- interval 변경 시 chart 높이가 흔들리지 않도록 skeleton/placeholder 고정
- API plan의 최대 point 수를 존중
- transformed data를 `useMemo`
- Reduce Motion 적용

## 14.6 내비게이션

`docs/MARKET_DATA_INTEGRATION_PLAN.md`의 “상단 시장 탭” 지시는 이 문서에서 다음으로 수정한다.

```text
Bottom Tab: 종목
Detail Stack: /market/[symbol]
```

provider/API/DB 설계는 변경하지 않는다.

---

# 15. 금융 숫자 강조 규칙

## 15.1 우선순위

한 화면의 시각적 위계는 다음 순서다.

1. 고객이 가장 궁금한 핵심 금융 숫자
2. 숫자의 의미
3. 변화량/상태
4. 차트
5. 행동 버튼
6. 부가 메타데이터

현재처럼 페이지 제목, disclaimer, card border가 금액보다 강하게 보이지 않도록 한다.

## 15.2 화면별 Hero 수치

| 화면 | Hero |
|---|---|
| 홈 | 총 자산 |
| 종목 상세 | 현재가 |
| 플랜 결과 | 목표 달성 가능성 |
| 주문 | 주문 예상금액 |
| 계좌 상세 | 계좌 평가금액 또는 현금 |
| 자산 구성 | 자산 비중 |

## 15.3 구현 규칙

- `MoneyValue size="hero"` 사용
- tabular numbers
- 숨김 토글 지원
- amount와 unit baseline 정렬
- 34px를 기본 hero size로 사용
- 두 개 이상의 hero 숫자를 한 화면 상단에 경쟁시키지 않는다.
- 날짜/출처/engine 같은 메타를 hero와 같은 줄에 넣지 않는다.
- 금액 Card 안의 padding은 충분히 확보한다.
- 숫자 주변에 오렌지 배경을 과도하게 칠하지 않는다.
- orange는 작은 bar, dot, chart line, selected indicator에 사용한다.

---

# 16. 차트 고도화

## 16.1 공통 Chart Theme

`shared/design-system/charts/chart-theme.ts`

정의:

- axis label
- grid line
- line width
- point radius
- tooltip surface
- tooltip typography
- chart padding
- brand series colors
- allocation palette
- simulation band opacity

예시 allocation palette:

```ts
export const allocationChartColors = [
  '#F37321',
  '#353968',
  '#5C7687',
  '#C7BB9F',
  '#A7ABB3',
] as const;
```

## 16.2 `AssetTrendChart`

현재 자산 bar chart를 line/area chart로 교체한다.

요구:

- 총자산 추이 Line
- line orange
- area very soft orange gradient
- 기준 grid 최소화
- 첫/마지막 날짜 label
- press tooltip: 날짜 + 자산
- selected point dot
- 데이터가 많으면 downsample은 서버 또는 기존 point limit을 존중
- 금액 숨김 시 tooltip/accessibility도 숨김
- reduce motion 대응

## 16.3 `AllocationDonutChart`

현재 horizontal fill bar만 사용하지 않는다.

요구:

- Donut
- 중앙에는 `자산 구성` 또는 총 비중 100%
- legend row: color dot + asset class + percentage + amount 가능 시 금액
- 너무 작은 slice도 legend에는 표시
- slice label을 chart 내부에 과도하게 넣지 않는다.
- 색상만으로 구분하지 않고 legend text 제공
- VoiceOver/TalkBack용 전체 요약 label

## 16.4 `SimulationRangeChart`

요구:

- p10~p90 band
- p50 line
- legend:
  - 보수적
  - 기준
  - 기대
- 선택 시:
  - 기간
  - 보수적 금액
  - 기준 금액
  - 기대 금액
- p10/p50/p90 내부 명칭은 accessibility/debug를 제외하고 고객에게 직접 노출하지 않는다.
- band는 soft orange 또는 soft info color
- p50 line은 orange
- p10/p90 line을 모두 강하게 그려 복잡하게 만들지 않는다.

## 16.5 `MarketPriceChart`

앞 절 요구사항 적용.

## 16.6 Chart 성능

- chart input normalization을 component render 안에서 반복하지 않는다.
- `useMemo`
- stable callbacks
- broad Zustand subscription 금지
- parent query fetching 때문에 chart 전체가 불필요하게 remount되지 않게 한다.
- height 고정
- interval 변경 시 skeleton 유지
- 120~156 points 기준 smooth scroll/press 확인
- 웹 fallback 파일이 필요한 경우 동일한 고객 디자인으로 제공
- iOS/Android 실제 device 또는 emulator에서 확인

---

# 17. 화면 상태 디자인

모든 화면은 다음 상태를 고려한다.

```text
Initial
Loading
Refreshing
Ready
Empty
Partial failure
Full failure
Stale
Disabled
Submitting
Success
```

## 17.1 Loading

- 중앙 spinner만 장시간 표시하지 않는다.
- 데이터 구조가 예상되면 skeleton 사용
- primary action loading 시 label과 indicator
- chart 영역 높이 유지

## 17.2 Empty

- 기술 원인을 설명하지 않는다.
- 다음 행동을 제시한다.

예:

```text
아직 연결된 계좌가 없습니다.
자산을 확인하려면 금융기관을 연결해 주세요.
[ 금융기관 연결 ]
```

## 17.3 Error

- raw error code 금지
- retry 가능 여부에 따라 버튼 노출
- partial error는 기존 데이터 유지
- full error만 screen-level ErrorState

## 17.4 Stale

- 기존 데이터를 숨기지 않는다.
- `지연된 정보` chip + 작은 안내
- 날짜/수집시각 제공
- 경고색을 화면 전체에 확장하지 않는다.

---

# 18. 접근성

필수 조건:

- 버튼 touch target 최소 44×44
- 주요 버튼 52
- accessibilityRole 유지
- selected tab/segment accessibilityState 유지
- 금액 숨김 상태 accessibility label도 숨김
- chart는 전체 요약 label 제공
- 선택된 chart point는 live region으로 읽기
- red/blue 색만으로 상승/하락 전달하지 않고 `상승`, `하락` wording 포함
- normal body 15px 권장
- 11px 남용 금지
- orange small text contrast 주의
- disabled state는 opacity만으로 표현하지 않는다.
- Reduce Motion 유지
- Screen reader 순서가 visual hierarchy와 일치
- bottom tab label 생략 금지

---

# 19. 디자인 시스템 강제 검사

새 스크립트를 추가한다.

```text
apps/mobile/scripts/check-design-system.mjs
```

최소 검사:

1. `apps/mobile/src/features/**/ui/*.tsx`
2. `apps/mobile/src/app/**/*.tsx`

에서 design-system token 파일 외의 신규 raw hex color 사용을 금지한다.

예외:

- `shared/design-system/tokens/colors.ts`
- chart data-driven style에서 token 값을 참조하는 경우
- test fixture

또한 다음 customer-facing forbidden copy를 UI 파일에서 검사한다.

```text
샌드박스
Sandbox
synthetic
데이터셋
dataset
PKCE
OIDC
SecureStore
access token
refresh token
contract
platform-v1
계산 엔진
서버 저장 결과
개발자 도구
테스트 데이터 초기화
자동 재시도
```

주의:

- 내부 API/model/test 파일은 검사 대상에서 제외
- `DemoDisclosure`의 `포트폴리오 시연`, `예시 정보`는 허용

`apps/mobile/package.json`:

```json
{
  "scripts": {
    "design-system:check": "node scripts/check-design-system.mjs"
  }
}
```

root `verify` 또는 mobile verify sequence에 포함한다.

---

# 20. 테스트 변경

## 20.1 기존 테스트

다음 테스트의 old copy assertion을 수정한다.

```text
apps/mobile/src/features/login/ui/oidc-login-screen.test.tsx
apps/mobile/src/features/app-lock/ui/app-lock-boundary.test.tsx
apps/mobile/src/features/wealth/ui/wealth-dashboard-screen.test.tsx
apps/mobile/src/features/simulation/ui/simulation-screen.test.tsx
apps/mobile/src/features/order/ui/order-screen.test.tsx
apps/mobile/src/features/settings/ui/settings-screen.test.tsx
apps/mobile/src/features/health/ui/health-screen.test.tsx
apps/mobile/src/features/identity/ui/current-user-screen.test.tsx
```

실제 사용처 제거로 screen을 삭제하면 해당 UI 테스트도 삭제하되 underlying hook/model test는 보존한다.

## 20.2 신규 공통 Component test

최소:

```text
MoneyValue
Button loading/disabled
SegmentedControl selected state
MarketChange up/down/flat
StatusChip label mapping
DemoDisclosure
```

## 20.3 Chart test

Chart library rendering 자체보다 다음을 테스트한다.

- input transform
- empty data
- selected point label
- hidden amount accessibility
- p10/p50/p90 → 보수적/기준/기대 mapping
- up/down color selection
- interval label mapping
- stale state

## 20.4 Navigation test

- 기본 진입 → 홈
- 종목 tab
- 플랜 tab
- 내 정보 tab
- 종목 상세 route
- 주문 route
- AppLock/Login boundary가 tabs 밖에서 정상 동작

## 20.5 Copy regression test

UI source 및 렌더 결과에서 forbidden terms가 노출되지 않는지 확인한다.

---

# 21. 구현 순서

## Phase 1. Repository 재분석

- working tree 확인
- 신규 종목 파일 확인
- 현재 route와 imports 확인
- 사용하지 않는 Health/Identity screen 판단
- baseline test 실행

완료 조건:

- 사용자 작업 손실 없음
- 변경 대상 목록 기록

## Phase 2. Token과 Primitive

- color
- typography
- spacing
- radius
- shadow
- motion
- AppText
- Screen
- Card
- Button
- TextField
- MoneyValue
- Notice/State components

완료 조건:

- 공통 Component unit test 통과
- dark color hardcoding 추가 없음

## Phase 3. Navigation

- Bottom Tabs
- Home/Market/Plan/My
- Order stack
- Market detail stack
- status bar light theme

완료 조건:

- 4개 tab 전환
- back navigation
- auth/app lock 정상

## Phase 4. Customer Copy

- login
- app lock
- wealth
- simulation
- order
- settings
- market
- accessibility labels
- app name

완료 조건:

- forbidden copy scan 통과
- developer tool UI 제거

## Phase 5. Core Screen Migration

순서:

1. Login
2. App Lock
3. Home/Wealth
4. Plan/Simulation
5. Order
6. My/Settings
7. Market Search/Detail

완료 조건:

- 각 feature UI에서 공통 component 사용
- raw colors 제거

## Phase 6. Chart Upgrade

1. AssetTrendChart
2. AllocationDonutChart
3. SimulationRangeChart
4. MarketPriceChart

완료 조건:

- 실제 Victory Native/Skia rendering
- tooltip 또는 selected point
- Reduce Motion
- empty/stale state

## Phase 7. Tests and Cleanup

- old styles 제거
- unused imports/files 제거
- tests update
- design-system check
- typecheck/lint/test/build

완료 조건:

```bash
npm run verify
```

통과.

---

# 22. 권장 Commit 단위

Codex가 commit까지 수행할 권한이 있을 때 다음처럼 나눈다.

```text
refactor(mobile): introduce plus-inspired design system
refactor(mobile): migrate navigation and customer-facing copy
refactor(mobile): migrate wealth simulation order and profile screens
feat(mobile): apply design system to market search and detail
feat(mobile): upgrade financial charts and interactions
test(mobile): add design-system and customer-copy regression checks
```

사용자의 현재 uncommitted 종목 작업을 임의로 별도 commit하지 않는다. 먼저 변경 범위를 확인한다.

---

# 23. 최종 Definition of Done

아래 항목을 모두 충족해야 완료다.

## Design System

- [ ] 공통 token 존재
- [ ] 공통 text/button/card/input/screen 존재
- [ ] 화면별 raw hex color 제거
- [ ] 화면별 중복 button/card style 제거
- [ ] 금융 숫자 component 공통화
- [ ] light-first theme

## Customer Copy

- [ ] 샌드박스 제거
- [ ] dataset/contract/PKCE/OIDC 등 고객 노출 제거
- [ ] local/test login도 사용자에게는 `로그인`
- [ ] 개발자 도구 UI 제거
- [ ] 기술 error code 노출 없음
- [ ] 예시 데이터 고지는 고객 문장으로 통합
- [ ] 실제 KIS 시세와 예시 계좌 데이터 안내 구분

## Navigation

- [ ] Bottom Tabs: 홈/종목/플랜/내 정보
- [ ] Order stack route
- [ ] Market detail route
- [ ] selected state 명확
- [ ] auth/app lock regression 없음

## Financial Hierarchy

- [ ] Home 총자산 Hero
- [ ] Market 현재가 Hero
- [ ] Plan 목표 가능성 Hero
- [ ] Order 예상금액 Hero
- [ ] tabular numbers
- [ ] money hiding 일관성

## Charts

- [ ] 자산 trend line/area
- [ ] allocation donut
- [ ] simulation confidence band + median
- [ ] market line/area
- [ ] selected point/tooltip
- [ ] stale/empty handling
- [ ] Reduce Motion
- [ ] accessibility summary

## Quality

- [ ] 신규 종목 화면의 현재 구현 보존
- [ ] API/Backend 계약 변경 없음
- [ ] tests update
- [ ] forbidden copy check
- [ ] design-system hardcoding check
- [ ] `npm run verify` 통과
- [ ] iOS/Android에서 화면 확인

---

# 24. Codex 최종 보고 형식

구현 완료 후 다음을 보고한다.

```text
1. 변경한 파일
2. 새로 만든 디자인 시스템 구조
3. 제거한 사용자 노출 기술 문구
4. 내비게이션 변경
5. 화면별 주요 UI 변경
6. 차트 변경
7. 신규 종목 화면 적용 결과
8. 유지한 business logic
9. 실행한 테스트와 결과
10. 남은 제약 및 후속 작업
```

“한화 스타일을 적용했다”는 추상적 표현만 쓰지 말고, 실제 token/component/file 단위로 설명한다.

---

# 25. 참고 자료

아래 자료는 디자인 방향을 이해하기 위한 참고다. 실제 자산을 복제하지 않는다.

1. 한화금융 PLUS 공식 사이트  
   https://plusbrand.co.kr/

2. PLUS 파이 공식 사이트  
   https://plus-pi.com/

3. PLUS 파이 App Store  
   https://apps.apple.com/kr/app/id6755743981

4. 한화 Brand System Design Guide  
   https://www.hanwha.com/upload/newsroom/media-library/contents/20240521/1716274557872.pdf

5. 한화투자증권 MTS App Store  
   https://apps.apple.com/kr/app/id1200606784

6. 저장소 내부 종목 연동 계획  
   `docs/MARKET_DATA_INTEGRATION_PLAN.md`

---

# 26. 마지막 주의사항

- 한화 오렌지를 많이 쓰는 것이 한화 스타일이 아니다.
- 카드 배경을 여러 파스텔 색으로 나누는 것이 PLUS 스타일이 아니다.
- 고객에게 기술 구조를 설명하는 것이 전문적으로 보이는 것이 아니다.
- `Sandbox`를 `Test`로 바꾸기만 하면 고객 언어가 되는 것이 아니다.
- Dark Navy를 White로 바꾸는 것만으로 디자인 시스템이 되는 것이 아니다.
- 중요한 것은 **정보 위계, 고객 목표 중심 문구, 큰 금융 숫자, 절제된 브랜드색, 통일된 공통 Component, 실제 차트 품질**이다.
- 현재 앱의 강점인 인증·생체인증·세션·TanStack Query·Zustand·주문 상태·장애처리는 보존한다.
- 신규 종목 화면이 구현 중이므로 이 문서의 예상 파일명보다 실제 working tree를 우선한다.
