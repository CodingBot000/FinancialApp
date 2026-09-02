# 종목 차트 복구와 StockTracker 정보 확장 실행계획

- 상태: `IMPLEMENTED_LOCAL_PENDING_KIS_SMOKE`
- 작성일: 2026-09-03
- 대상: FinancialApp React Native 시장 화면과 Platform API `MarketModule`
- 기준 구현: commit `4ac2659`
- 참고 구현: `/Users/switch/Development/Web/StockTracker`
- 원격 자원 사용: 금지 — 별도 승인 전 local/Testcontainers만 사용
- 원격 DB migration/deploy: 금지

## 구현 결과 (2026-09-03)

- Phase 0~5 완료: chart/data P0, quote UI와 Android native 검증
- `victory-native@42 + Skia + Reanimated + CartesianChart` 유지
- timestamp X축, compact price Y축, grid, `monotoneX` Line과 하단 기준 Area 적용
- 실제 chart press로 선택 날짜·종가·OHLC·거래량 tooltip 갱신 확인
- local provider를 고정 anchor와 부드러운 deterministic wave로 변경
- logical bucket normalization을 local/KIS/service/repository에 공통 적용
- local cleanup: 중복 90행 제거 후 legacy/canonical 중복 30행 추가 정리
- 최종 local repair dry-run: 614행, duplicate 0, normalization 0
- platform-api 두 번 재시작 후 DAILY DB/API 모두 120개로 불변
- Android UI에서 분 120/일 120/주 156/월 120/년 40 전환 확인
- Android chart에서 축, Area, selected point와 중간 날짜 tooltip 확인
- root verify 통과: mobile 109, simulator 12, platform 96 tests와 backend build
- Phase 6 호가·뉴스·공시·AI는 별도 승인 전 미실행
- 원격 DB/credential/migration/deploy 미사용

## 1. 목적

현재 React Native 종목 차트의 렌더링 오류와 로컬 봉 중복 적재를 먼저 복구한다.
그 다음 StockTracker와 비교했을 때 화면에서 빠진 정보를 기존 계약으로 가능한 범위와
신규 backend 계약이 필요한 범위로 나누어 구현한다.

완료 후 사용자는 다음 흐름을 안정적으로 사용할 수 있어야 한다.

1. 종목명 또는 종목코드를 검색한다.
2. 현재가, 전일대비, 등락률, 거래량, 출처와 갱신 시각을 확인한다.
3. 분·일·주·월·년 차트를 전환한다.
4. X축 날짜와 Y축 가격을 읽을 수 있다.
5. 차트를 누르거나 움직여 선택 날짜의 가격을 확인한다.
6. 같은 interval을 반복 조회해도 같은 논리 봉이 중복되지 않는다.
7. provider 장애 시 마지막 성공 차트와 지연 상태를 확인한다.

## 2. 고정 기술 스택

아래 네 항목을 차트 구현의 고정 전제로 사용한다.

1. `victory-native@42.0.0`
2. `@shopify/react-native-skia@2.6.2`
3. `react-native-reanimated@4.5.1`
4. Victory Native의 `CartesianChart`

역할은 다음과 같다.

```text
MarketPriceChart
  └─ victory-native
       └─ CartesianChart + Line + Area
            ├─ React Native Skia: 선·면·축·선택점 렌더링
            └─ Reanimated: chart press state와 애니메이션
```

금지:

- 모바일에 Recharts를 설치하거나 웹 Recharts 컴포넌트를 복사
- WebView로 StockTracker 화면을 삽입
- 모바일에서 KIS 또는 StockTracker API를 직접 호출
- 차트 오류 회피를 위해 정적 이미지 차트로 대체
- `bucketAt`을 버리고 배열 index만 X축으로 사용

`linear`, `monotoneX`, `natural`은 라이브러리가 아니라 Victory Native의 선 보간
옵션이다. 한화 디자인 지시서는 특정 보간 방식을 강제하지 않는다. 이번 복구에서는
StockTracker의 monotone 선과 금융 시계열의 과도한 overshoot 방지를 근거로
`monotoneX`를 기본값으로 사용한다. 데이터가 2개뿐이거나 native 검증에서 왜곡이
발견되면 `linear`로 fallback한다. `natural`은 사용하지 않는다.

### 2.1 `종목`과 기존 `주문` 기능의 경계

2026-09-03 사용자 요구에 따라 기존 디자인 지시서의 “주문 Bottom Tab 제거” 결정을
이 계획에서는 다음과 같이 변경한다.

```text
Bottom Tabs:
홈 | 종목 | 주문 | 플랜 | 내 정보
```

- `종목`: KOSPI/KOSDAQ 검색, 현재가, 기간별 차트와 외부 시장정보
- `주문`: 기존 합성 보유자산의 견적, 생체인증, 매수 확정, 주문상태와 이력
- 두 기능은 데이터 모델과 사용자 목적이 다르므로 하나의 화면이나 route로 합치지 않음
- 기존 `OrderScreen`, `useOrderFlow`, 주문 API 계약과 테스트를 그대로 재사용
- `apps/mobile/src/app/(tabs)/order.tsx`에서 기존 `OrderScreen`을 직접 노출
- top-level `/order` route는 contextual/deep-link 호환을 위해 유지
- 종목 상세의 실제 주식과 합성 주문 instrument 간 매핑이 없으므로 임의 연결하지 않음

이 내비게이션 변경은 주문 backend/API/DB를 변경하지 않는다.

## 3. 확인된 문제와 근거

### 3.1 Area 기준선 오류 — P0

현재 `StockPriceChart`는 Victory Native `Area`에 `y0={0}`을 전달한다.
Victory Native의 `y0`은 가격 0이 아니라 Skia canvas의 Y 좌표이며 0은 화면 상단이다.
면이 차트 하단이 아니라 상단으로 닫히므로 비정상적인 채움 영역이 만들어진다.

수정 기준:

```tsx
{({ points, chartBounds }) => (
  <Area
    points={points.close}
    y0={chartBounds.bottom}
    curveType="monotoneX"
    opacity={0.18}
  />
)}
```

Area는 `colors.brand.soft` 계열의 연한 주황색을 사용한다. 하락 의미 색상인
`colors.market.downSoft`를 일반 시계열 Area 색으로 사용하지 않는다.

### 3.2 날짜와 축 소실 — P0

현재 mapper는 `MarketBar`에서 `bucketAt`을 버리고 `{ index, close }`만 반환한다.
그 결과 X축 날짜를 만들 수 없고 `CartesianChart`에도 축 설정이 없다.

수정할 chart point:

```ts
interface MarketChartPoint {
  timestamp: number;
  bucketAt: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

규칙:

- `xKey="timestamp"`
- `yKeys={['close']}`
- X축 label은 interval별 formatter 사용
- Y축 label은 compact price formatter 사용
- X/Y scale은 `linear`
- Y domain은 데이터 최저/최고에 3~5% padding을 적용하고 0을 강제 포함하지 않음
- 입력은 `bucketAt ASC` 정렬 후 렌더링
- invalid OHLC/volume은 0으로 바꾸지 않고 mapper에서 제외

### 3.3 실제 선택 지점과 tooltip 미구현 — P1

현재 차트 전체가 하나의 `Pressable`이고 누를 때 첫 값과 마지막 값만 토글한다.
누른 위치와 선택 데이터가 연결되어 있지 않으며 선택 날짜도 표시하지 않는다.

수정 기준:

- Victory Native `useChartPressState` 사용
- `CartesianChart`의 `chartPressState`에 연결
- Reanimated shared value로 현재 X/Y 위치 추적
- Skia `Circle`과 세로 guide line으로 선택 지점 표시
- tooltip에는 날짜, 종가, 등락 방향을 표시
- 분봉은 `HH:mm`, 일·주봉은 `MM.dd`, 월봉은 `YY.MM`, 연봉은 `YYYY`
- TalkBack에서 동일 정보를 읽을 수 있도록 live region text도 갱신
- Reduced Motion에서는 path animation을 제거하되 선택점 이동은 즉시 반영

### 3.4 로컬 봉 중복 적재 — P0

로컬 provider가 매 호출마다 `Date.now()`를 기준으로 `bucketAt`을 생성한다. DB unique
key는 정확한 `(instrument_id, interval, bucket_at)`이므로 같은 일봉도 시·분·초가
다르면 새 행으로 저장된다.

2026-09-03 진단 결과:

- 삼성전자 DAILY가 최초 60행이고 같은 날짜가 2행씩 존재
- 진단 GET 이후 90행으로 증가하고 같은 날짜가 3행씩 존재
- 조회 자체가 provider refresh와 cache upsert를 수행해 중복을 재현
- 원격 DB는 사용하지 않음

수정 원칙:

- 로컬 dataset은 고정 anchor date를 사용해 deterministic하게 생성
- interval별 `bucketAt`을 논리 경계로 정규화
- 같은 provider 요청을 두 번 수행해도 row count가 동일해야 함
- KIS 응답도 저장 직전에 동일 정규화 함수를 통과
- repository/service read 경계에서 logical bucket 중복을 한 번 더 제거
- 원격 DB cleanup은 실행하지 않음

논리 bucket:

| Interval | Logical bucket |
|---|---|
| `MINUTE` | KST `YYYY-MM-DD HH:mm`, 초·밀리초 0 |
| `DAILY` | KST 거래일 `YYYY-MM-DD` |
| `WEEKLY` | 해당 거래 주의 첫 거래일 |
| `MONTHLY` | `YYYY-MM` |
| `YEARLY` | `YYYY` |

로컬 anchor는 dataset version과 함께 고정한다. 실행 시각이 바뀌어도 동일한 fixture는
동일한 `bucketAt`을 생성해야 한다.

### 3.5 테스트가 차트 렌더링을 우회 — P0

현재 mobile component test는 `victory-native`의 `CartesianChart`, `Line`, `Area`를
null mock으로 대체한다. 따라서 잘못된 `y0`, 축 누락, tooltip 미연결을 검출하지 못한다.
또한 contract mock은 DAILY fixture만 반환하므로 다른 interval 전환을 실제로
검증하지 않는다.

수정 원칙:

- mapper/domain 계산은 실제 함수로 unit test
- Victory wrapper는 render callback을 실행하는 최소 test adapter 사용
- `chartBounds.bottom`이 Area에 전달되는지 검증
- 5개 interval fixture를 제공하고 interval 변경 후 새 bars를 확인
- Android emulator에서 실제 Skia rendering screenshot을 필수 evidence로 남김
- native 검증 없는 상태에서 chart 완료 체크 금지

### 3.6 StockTracker 대비 정보 누락 — P1/P2

StockTracker는 종목 선택 시 현재가, 차트, 뉴스, 호가, 공시, AI 이벤트를 병렬로
조회한다. FinancialApp canonical contract에는 종목 검색, 현재가, bars 세 operation만
존재한다.

누락은 두 범위로 나눈다.

#### 기존 API로 바로 가능한 정보 — P1

- 현재가
- 전일대비
- 등락률
- 거래량
- 시장/업종
- 제공처
- 수집 시각
- 최신/지연 상태
- 선택 interval과 bars 개수
- 최신 bar의 시가/고가/저가/종가/거래량

이 항목은 backend contract 변경 없이 화면 정보 위계만 개선한다.

#### 신규 backend 계약이 필요한 정보 — P2 후속

- KIS 호가
- 뉴스
- DART 공시
- AI 이벤트 분석
- 관심종목/알림

이 항목은 차트 복구와 같은 변경에 넣지 않는다. provider 선택, credential, 저장
정책, OpenAPI, DB migration과 보안 검토가 필요하므로 별도 승인된 후속 vertical
slice로 진행한다.

## 4. 목표 화면

```text
<  삼성전자
005930 · 코스피 · 전자부품 제조업

[현재가]      [전일대비]
74,200원      +1,200원
[등락률]      [거래량]
+1.64%        12,452,301

한국투자증권 제공 · 최신 정보 · 갱신 시각

[분] [일] [주] [월] [년]            일봉 107개

Y축 가격 ┌─────────────────────────
         │   Line + soft Area
         │        ● 선택 지점
         └───────────────────────── X축 날짜

[09.01] 74,200원
시가 / 고가 / 저가 / 종가 / 거래량

시세는 수집 시각을 기준으로 하며 지연될 수 있습니다.
```

모바일 폭에서 네 개 metric을 반드시 한 줄에 넣지는 않는다. 2열 grid를 기본으로 하고
접근성 글자 크기에서 1열로 자연스럽게 내려가도록 한다.

하단 내비게이션에서는 `종목`과 `주문`을 동시에 표시한다. `종목` 화면의 검색/차트
상태와 `주문` 화면의 견적/주문 상태는 서로 공유하거나 덮어쓰지 않는다.

## 5. 구현 구조

```text
apps/mobile/src/features/market/
  model/
    market-chart-model.ts
    market-chart-model.test.ts
  ui/
    market-quote-summary.tsx
    market-price-chart.tsx
    market-price-chart.test.tsx
    market-screen.tsx
    market-detail-screen.tsx

apps/mobile/src/shared/design-system/charts/
  chart-theme.ts
  chart-axis-format.ts

services/platform-api/src/modules/market/
  domain/
    market-bucket.ts
  infrastructure/http/
    local-market-data.adapter.ts
    kis-market-data.adapter.ts
  infrastructure/persistence/
    drizzle-market.repository.ts
```

원칙:

- feature mapper는 wire DTO를 chart point로 한 번만 변환
- chart component는 API 호출이나 DTO validation을 수행하지 않음
- controller에서 chart formatting/deduplication을 수행하지 않음
- local/KIS provider가 같은 bucket normalization 규칙을 사용
- design token을 사용하고 chart file에 색상 hex를 직접 추가하지 않음

## 6. Phase별 실행계획

### Phase 0 — 기준선과 재현 증거

1. 현재 local DB interval별 row count와 duplicate bucket 수를 기록한다.
2. 현재 Android 종목 차트 screenshot을 저장한다.
3. DAILY API 응답의 bars count와 중복 bucket을 fixture로 보존한다.
4. `ISSUE_REGISTER.md`에 chart rendering/data-integrity issue를 등록한다.

완료 조건:

- 코드 수정 전 재현 데이터와 screenshot이 존재
- 원격 DB/credential 사용 없음

### Phase 1 — 봉 데이터 무결성 복구

1. `MarketInterval`별 logical bucket 함수와 unit test를 만든다.
2. local provider를 고정 anchor 기반 deterministic series로 변경한다.
3. KIS adapter의 normalized bar에도 bucket 정규화를 적용한다.
4. repository/service에서 방어적 dedupe를 적용한다.
5. provider를 두 번 호출하고 upsert한 뒤 row count 불변을 검증한다.
6. 로컬 중복 데이터 정리 CLI를 별도 구현한다.

정리 CLI 안전 조건:

- 기본 `--dry-run`
- `APP_ENV=local`이 아니면 즉시 거부
- `source='LOCAL'` row만 대상
- `finapp_market.finapp_market_price_bar`만 대상
- 삭제 예정 건수와 logical bucket을 먼저 출력
- 명시적 `--execute` 없이는 DELETE 금지
- remote URL hostname이면 거부

완료 조건:

- 같은 interval을 반복 조회해도 DB row count 증가 없음
- API 응답에 logical duplicate 없음
- cleanup 실행 전후 테스트 증거 존재
- 기존 `cdd_*`와 다른 `finapp_*` 객체 접근 없음

### Phase 2 — Chart model 복구

1. `bucketAt`을 보존하는 `MarketChartPoint`를 작성한다.
2. 숫자, 정렬, invalid row 제거와 domain padding을 pure function으로 만든다.
3. interval별 X축 formatter를 작성한다.
4. compact price Y축 formatter를 작성한다.
5. latest bar OHLC/volume view model을 작성한다.

완료 조건:

- chart model에 timestamp/date/close가 모두 존재
- invalid row를 0으로 변환하지 않음
- unsorted/duplicate fixture가 정렬·dedupe됨
- interval별 formatter unit test 통과

### Phase 3 — Victory Native 차트 재구현

1. `CartesianChart`에 timestamp X축과 close Y축을 연결한다.
2. Skia `matchFont`로 axis label font를 준비한다.
3. X/Y axis와 최소 grid를 chart theme token으로 표시한다.
4. `Area y0`를 `chartBounds.bottom`으로 변경한다.
5. Line/Area에 `curveType="monotoneX"`를 적용한다.
6. Area opacity를 낮추고 brand orange 계열을 사용한다.
7. `useChartPressState`와 Reanimated로 selected point를 연결한다.
8. Skia Circle/guide line과 React Native tooltip surface를 표시한다.
9. Reduced Motion일 때 path animation을 제거한다.

완료 조건:

- Area가 chart top으로 닫히지 않음
- X축 3~6개, Y축 3~5개 label이 겹치지 않음
- Y domain이 가격 0을 강제로 포함하지 않음
- 누른 위치와 tooltip 날짜/가격이 일치
- 첫/중간/마지막 지점을 선택 가능
- 5개 interval 모두 같은 chart 높이 유지

### Phase 4 — 현재가 정보 위계와 상세 화면 보완

1. 현재가/전일대비/등락률/거래량을 2열 metric grid로 표시한다.
2. 제공처, freshness, 갱신 시각을 한 영역으로 정리한다.
3. chart header에 interval label과 bars 개수를 표시한다.
4. 선택 bar의 OHLC/volume을 chart 아래에 표시한다.
5. stale/empty/loading/error placeholder의 높이를 고정한다.
6. `MarketScreen`과 `MarketDetailScreen`이 같은 quote/chart component를 사용한다.
7. 하단 탭에 `종목`과 기존 `주문`을 각각 노출한다.
8. `주문` 탭은 기존 `OrderScreen`을 변경 없이 route에 연결한다.
9. route smoke에서 `홈/종목/주문/플랜/내 정보` 5개 탭을 검증한다.

완료 조건:

- StockTracker screenshot의 네 quote metric이 모두 표시됨
- 사용자에게 `FRESH`, `STALE`, `LOCAL` 원문 노출 없음
- list 화면과 detail 화면의 정보가 불필요하게 중복되지 않음
- 접근성 글자 크기에서 metric grid가 잘리지 않음
- `종목`과 `주문` 탭이 동시에 존재하고 서로 다른 화면을 렌더링
- 기존 주문 견적/생체인증/상태/이력 component test 통과

### Phase 5 — 테스트와 Android native 검증

1. contract mock에 5개 interval fixture를 추가한다.
2. interval 변경 후 실제 새 bars와 label을 검증한다.
3. chart render adapter가 child callback을 실행하도록 수정한다.
4. `y0`, axes, selected point와 tooltip 상태 test를 추가한다.
5. Android API 36 emulator에서 local HTTP mode로 검색→상세를 실행한다.
6. 분·일·주·월·년 screenshot을 남긴다.
7. rotation/font scale/reduced motion을 확인한다.
8. root verify와 backend production build를 실행한다.

완료 조건:

- mobile unit/component/architecture/lint/typecheck 통과
- platform market unit/integration/E2E 통과
- Android native screenshot에서 축/선/Area/tooltip 정상
- fatal/Skia/ReactNativeJS error 없음
- `npm run verify` 통과

### Phase 6 — StockTracker 정보 확장 후속 트랙

차트 복구 완료 후 아래 순서로 별도 승인해 진행한다.

#### Phase 6A — KIS 호가

- KIS `inquire-asking-price-exp-ccn`, TR `FHKST01010200`
- FinancialApp 전용 provider port/normalized DTO/cache table
- `GET /api/v1/market/stocks/{symbol}/orderbook`
- 모바일 매도/매수 호가 요약

#### Phase 6B — 뉴스와 공시

- 뉴스 provider와 DART provider를 먼저 확정
- provider 이용약관, credential와 호출 제한 검토
- FinancialApp 전용 `finapp_market` 하위 table과 OpenAPI 추가
- 모바일 최신 뉴스/공시 목록과 source link

#### Phase 6C — AI 이벤트 분석

- 수집된 뉴스·공시·가격을 입력으로 하는 batch 분석
- source item, model version, confidence와 generated-at 저장
- 투자 추천이 아닌 사건 분류/요약으로 범위 제한
- disclaimer와 빈 상태 필수
- 실제 모델이 없으면 가짜 AI 결과를 표시하지 않음

Phase 6 공통 조건:

- StockTracker API/DB에 runtime 의존하지 않음
- canonical OpenAPI와 operation coverage 먼저 변경
- versioned forward-only migration만 사용
- 실제 provider credential은 backend secret에만 보관
- 별도 승인 전 원격 migration/deploy 금지

## 7. 테스트 목록

### Backend unit

- logical bucket interval별 normalization
- local provider 두 호출 결과 동일
- KIS bar normalization과 timezone
- duplicate bars collapse
- provider unavailable + stale cache

### Backend integration

- 같은 bars 두 번 upsert 후 row count 동일
- interval별 ASC와 limit
- 다른 symbol/interval row 비간섭
- runtime role DDL 거부
- `finapp_market` 밖 객체 접근 없음

### Mobile unit/component

- `bucketAt` 보존과 timestamp 변환
- invalid OHLC 제거
- X/Y formatter
- metric grid 네 값
- 5개 interval query
- tooltip 날짜/가격
- stale/empty/loading/error
- reduced motion
- accessibility summary

### Native manual

- 작은 Android viewport
- font scale 1.0 / 1.3
- 분·일·주·월·년
- 첫/중간/마지막 touch
- 상승/하락/보합
- fresh/stale
- 0/1/2/120 point

## 8. 검증 명령

```bash
npm run typecheck -w @finapp/platform-api
npm run lint -w @finapp/platform-api
npm run test -w @finapp/platform-api

npm run architecture:check -w @finapp/mobile
npm run lint -w @finapp/mobile
npm run typecheck -w @finapp/mobile
npm run test -w @finapp/mobile

npm run contract:check
npm run security:secrets
npm run verify
```

Native 검증:

```bash
make infra-up
npm run android -w @finapp/mobile
```

Metro가 이미 실행 중이고 development build가 설치되어 있으면:

```bash
npm run start -w @finapp/mobile
```

## 9. 변경 예상 파일

### Backend

- `services/platform-api/src/modules/market/domain/market-model.ts`
- `services/platform-api/src/modules/market/domain/market-bucket.ts`
- `services/platform-api/src/modules/market/infrastructure/http/local-market-data.adapter.ts`
- `services/platform-api/src/modules/market/infrastructure/http/kis-market-data.adapter.ts`
- `services/platform-api/src/modules/market/infrastructure/persistence/drizzle-market.repository.ts`
- `services/platform-api/src/modules/market/application/market.service.ts`
- `services/platform-api/test/market/**`

### Mobile

- `apps/mobile/src/features/market/model/**`
- `apps/mobile/src/features/market/ui/market-price-chart.tsx`
- `apps/mobile/src/features/market/ui/market-screen.tsx`
- `apps/mobile/src/features/market/ui/market-detail-screen.tsx`
- `apps/mobile/src/shared/design-system/charts/**`
- `apps/mobile/src/shared/api/mock/fixtures/market-data.success.json`
- `apps/mobile/src/app/(tabs)/_layout.tsx`
- `apps/mobile/src/app/(tabs)/order.tsx`
- `apps/mobile/scripts/check-routes.mjs`
- 관련 component/contract test

### 문서

- `docs/IMPLEMENTATION_STATUS.md`
- `docs/ISSUE_REGISTER.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

## 10. 안전 기준

- 이번 차트 복구는 신규 DB migration 없이 완료하는 것을 우선한다.
- 기존 로컬 duplicate cleanup은 dry-run 결과 확인 후 별도 실행한다.
- 원격 AWS/FranchCommunity DB에 접속하지 않는다.
- `drizzle-kit push`, 기존 table `DROP`, `TRUNCATE`, destructive `ALTER`를 사용하지 않는다.
- KIS key/secret을 mobile env, fixture, screenshot, log에 넣지 않는다.
- StockTracker의 `stocktrack_*` table을 읽거나 변경하지 않는다.
- 사용자가 승인하기 전 Phase 6 provider/API/DB 확장을 시작하지 않는다.

## 11. Definition of Done

### Chart/Data P0

- [x] `Area y0={chartBounds.bottom}` 적용
- [x] local/KIS logical bucket normalization
- [x] 반복 조회 row count 불변
- [x] API logical duplicate 0
- [x] X축 날짜와 Y축 compact price 표시
- [x] selected point와 실제 touch tooltip
- [x] `monotoneX`, 필요 시 `linear` fallback
- [x] 5개 interval native rendering

### Quote/UI P1

- [x] 현재가/전일대비/등락률/거래량 표시
- [x] 제공처/갱신시각/freshness 표시
- [x] bars 개수와 선택 bar OHLC/volume 표시
- [ ] loading/empty/error/stale 고정 높이
- [ ] accessibility와 font scale 확인
- [x] `종목`과 기존 `주문`을 별도 Bottom Tab으로 동시 노출
- [x] 기존 `OrderScreen` 견적/생체인증/상태/이력 보존

### Quality

- [x] chart test가 Victory callback을 실제 실행
- [x] mock 5 interval 지원
- [x] Android screenshot evidence
- [x] mobile/platform 전체 test 통과
- [x] `npm run verify` 통과
- [x] secret scan 통과
- [x] 원격 DB/migration/deploy 미실행

### 후속 정보 확장

- [ ] Phase 6A 호가 별도 승인
- [ ] Phase 6B 뉴스/공시 provider 별도 승인
- [ ] Phase 6C AI 분석 별도 승인
