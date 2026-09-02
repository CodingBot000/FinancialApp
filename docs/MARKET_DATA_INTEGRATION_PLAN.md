# 외부 주식 시세·차트 통합 실행계획

- 상태: `IMPLEMENTED_LOCAL_PENDING_KIS_SMOKE`
- 작성일: 2026-09-02
- 대상: React Native(Expo) + NestJS/Fastify + PostgreSQL/Drizzle FinancialApp
- 구현 난이도 기준: Luna 모델이 단계별로 독립 구현 가능한 수준
- 구현 시작 여부: Phase 0~5 구현 완료, Phase 6의 실제 KIS smoke만 credential 대기
- 외부 유료 자원 실행: 없음
- 원격 DB migration: 금지 — 별도 승인 전 local/Testcontainers에서만 검증

## 구현 진행 상태 (2026-09-02)

- 완료: canonical OpenAPI/operation coverage, `finapp_market` 3개 table과 versioned migration
- 완료: KIS adapter/token cache/master parser, local deterministic provider, cache/stale 정책
- 완료: backend API, mobile HTTP/mock adapter, `시장` 탭과 5개 interval line chart
- 검증: local Compose migration/seed와 검색 → 현재가 → 차트 HTTP 흐름 통과
- 대기: 실제 KIS credential을 주입한 수동 smoke와 Android development build chart runtime 확인
- 미실행: 원격 DB migration/deploy. 기존 `cdd_*`와 FinancialApp 기존 schema/table은 변경하지 않음

## 1. 목표

React Native 앱에 `시장` 탭을 추가하고 사용자가 국내 상장 종목을 종목명 또는
종목코드로 검색한 뒤 현재가와 기간별 가격 차트를 조회할 수 있게 한다.

이 기능으로 포트폴리오에서 다음 역량을 증명한다.

- 외부 금융 API 연동
- 외부 provider credential의 서버 보관
- NestJS port/adapter 기반 provider 격리
- 외부 응답의 내부 계약 정규화
- PostgreSQL 기반 종목 마스터·시세 cache
- React Native 차트와 비동기 상태 처리
- rate limit, stale data, provider 장애 처리
- OpenAPI provider/consumer 계약 검증

## 2. 최종 사용자 시나리오

구현 완료 후 다음 흐름이 실제로 동작해야 한다.

1. 사용자가 로그인 후 상단 `시장` 탭을 누른다.
2. 검색창에 `삼성` 또는 `005930`을 입력한다.
3. KOSPI/KOSDAQ 종목 검색 결과가 최대 30건 표시된다.
4. `삼성전자 · 005930 · 코스피` 결과를 누른다.
5. 현재가, 전일 대비, 등락률, 거래량, 수집 시각과 출처가 표시된다.
6. 기본 `일봉` 차트가 표시된다.
7. `분봉`, `일봉`, `주봉`, `월봉`, `연봉`을 바꾸면 해당 차트가 갱신된다.
8. 외부 API가 실패하면 마지막 성공 데이터와 지연 상태 또는 재시도 안내가 표시된다.
9. 모바일 bundle, 로그와 API 응답에 KIS app key/secret이 노출되지 않는다.

## 3. 확정 결정

구현자는 아래 결정을 다시 선택하거나 바꾸지 않는다. 변경이 필요하면 먼저 이
문서를 수정하고 이유를 기록한다.

### 3.1 데이터 provider

- 1차 provider는 한국투자증권 KIS Open API다.
- 1차 지원 시장은 KOSPI와 KOSDAQ이다.
- 미국 주식, 해외 주식, 암호화폐는 이번 범위에 포함하지 않는다.
- StockTracker의 Google Finance scraping fallback은 가져오지 않는다.
- UI에서 `실시간`이라고 단정하지 않고 출처·수집시각·최신성 상태를 표시한다.

### 3.2 서비스 경계

- 모바일은 KIS를 직접 호출하지 않는다.
- 모바일은 기존 FinancialApp Platform API만 호출한다.
- Platform API의 `MarketModule`이 KIS adapter를 소유한다.
- FinancialApp은 StockTracker API나 StockTracker DB에 런타임 의존하지 않는다.
- StockTracker 코드는 동작 근거와 normalization 참고 자료로만 사용한다.

```text
React Native 시장 탭
        |
        | HTTPS + Bearer token
        v
FinancialApp Platform API /api/v1/market
        |
        +--> finapp_market cache/catalog
        |
        +--> KIS MarketDataProvider
                  |
                  v
            KIS Open API
```

### 3.3 모바일 차트

- StockTracker 웹의 Recharts 컴포넌트는 재사용하지 않는다.
- FinancialApp에 이미 설치된 `victory-native`, Skia, Reanimated를 사용한다.
- 1차 차트는 종가 기반 line chart다.
- OHLC candlestick, 거래량 보조 차트와 crosshair는 후속 범위다.

### 3.4 DB와 migration

- 신규 schema는 `finapp_market`이다.
- 모든 table/index/constraint 이름은 `finapp_` prefix 규칙을 따른다.
- 기존 `finapp_*`, `cdd_*`, StockTracker `stocktrack_*` 객체를 변경하지 않는다.
- `drizzle-kit push`를 사용하지 않는다.
- `drizzle-kit generate` 후 SQL을 검토하고 forward-only migration만 적용한다.
- 원격 DB에는 read-only catalog 확인과 별도 승인 전 migration을 실행하지 않는다.

### 3.5 인증

- 신규 scope는 `market.read`다.
- 검색, 현재가, 차트 endpoint 모두 OIDC guard와 `market.read`를 요구한다.
- local test token에는 local profile에서만 `market.read`를 추가한다.
- demo/production은 실제 Keycloak scope 검증을 유지한다.

## 4. 참조 구현

구현 전 아래 파일을 읽되 그대로 복사하지 않는다.

### 4.1 StockTracker

- `/Users/switch/Development/Web/StockTracker/docs/data_collection_storage_status.md`
  - KIS 종목 마스터, 현재가, 차트 봉 수집 범위
- `/Users/switch/Development/Web/StockTracker/apps/api/src/stocks/stocks.routes.ts`
  - 검색, 현재가, 차트 endpoint
- `/Users/switch/Development/Web/StockTracker/apps/api/src/stocks/stocks.service.ts`
  - 종목 검색, KIS normalization, 봉 upsert와 조회 정렬
- `/Users/switch/Development/Web/StockTracker/apps/api/src/kis/kis.client.ts`
  - KIS access token cache와 HTTP 호출
- `/Users/switch/Development/Web/StockTracker/apps/api/src/kis/kis-endpoints.ts`
  - KIS endpoint와 TR ID
- `/Users/switch/Development/Web/StockTracker/apps/web/src/App.tsx`
  - 종목 선택 후 quote/chart 병렬 조회 UX
- `/Users/switch/Development/Web/StockTracker/apps/web/src/types.ts`
  - Stock, PriceSnapshot, PriceBar response 형태

### 4.2 FinancialApp

- `apps/mobile/src/app/index.tsx`
  - 현재 상단 탭과 화면 전환
- `apps/mobile/src/shared/api/platform-api.ts`
  - 모바일 application-facing API port
- `apps/mobile/src/shared/api/http-platform-api.ts`
  - 실제 HTTP adapter
- `apps/mobile/src/shared/api/mock/contract-mock-platform-api.ts`
  - deterministic mobile mock
- `apps/mobile/src/features/health/ui/chart-smoke.tsx`
  - Victory Native line chart 사용 예
- `services/platform-api/src/app.module.ts`
  - backend module 조립
- `services/platform-api/src/modules/trading/**`
  - 외부 HTTP port/adapter와 circuit breaker 참고
- `contracts/openapi/platform-v1.yaml`
  - canonical API 계약
- `contracts/operation-coverage.yaml`
  - operation/provider/consumer 추적

## 5. API 계약

canonical base path는 `/api/v1/market`이다. 모든 응답은 KIS raw field를 노출하지
않고 FinancialApp contract로 정규화한다.

### 5.1 종목 검색

```http
GET /api/v1/market/stocks?q=삼성&limit=30
Authorization: Bearer <access-token>
```

검증:

- `q`: trim 후 1~50자
- `limit`: 기본 20, 최소 1, 최대 30
- 이름 또는 6자리 종목코드 검색
- KOSPI/KOSDAQ active 종목만 반환

응답:

```json
{
  "stocks": [
    {
      "symbol": "005930",
      "name": "삼성전자",
      "market": "KOSPI",
      "industry": "통신 및 방송 장비 제조업"
    }
  ]
}
```

### 5.2 현재가

```http
GET /api/v1/market/stocks/005930/quote
Authorization: Bearer <access-token>
```

응답:

```json
{
  "quote": {
    "symbol": "005930",
    "name": "삼성전자",
    "market": "KOSPI",
    "currency": "KRW",
    "currentPrice": "74200.0000",
    "changePrice": "1200.0000",
    "changeRate": "1.6438",
    "volume": "12452301",
    "capturedAt": "2026-09-02T06:20:00.000Z",
    "source": "KIS",
    "freshness": "FRESH"
  }
}
```

규칙:

- money/decimal은 JSON number가 아니라 canonical decimal string이다.
- volume은 정수 string이다.
- `freshness`: `FRESH | STALE`만 허용한다.
- cache가 없고 provider가 실패하면 503이다.
- stale cache가 있으면 200 + `STALE`로 반환한다.

### 5.3 차트 봉

```http
GET /api/v1/market/stocks/005930/bars?interval=DAILY
Authorization: Bearer <access-token>
```

`interval`:

- `MINUTE`
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `YEARLY`

응답:

```json
{
  "symbol": "005930",
  "interval": "DAILY",
  "source": "KIS",
  "freshness": "FRESH",
  "bars": [
    {
      "bucketAt": "2026-09-01T00:00:00.000Z",
      "open": "73100.0000",
      "high": "74600.0000",
      "low": "72800.0000",
      "close": "74200.0000",
      "volume": "12452301"
    }
  ]
}
```

규칙:

- `bars`는 `bucketAt ASC`로 반환한다.
- `MINUTE` 최대 120개, `DAILY` 120개, `WEEKLY` 156개,
  `MONTHLY` 120개, `YEARLY` 40개다.
- null OHLC row는 chart에서 제외하거나 contract error로 처리한다. 조용히 0으로
  바꾸지 않는다.

### 5.4 ProblemDetails

기존 ProblemDetails 구조를 유지하고 아래 code를 추가한다.

- `MARKET_STOCK_NOT_FOUND` — 404
- `MARKET_PROVIDER_UNAVAILABLE` — 503, retryable true
- `MARKET_RATE_LIMITED` — 429, retryable true
- `MARKET_DATA_INVALID` — 502, retryable false
- 기존 `AUTH_TOKEN_INVALID`, `AUTH_SCOPE_MISSING`, `VALIDATION_FAILED` 재사용

## 6. DB 설계

`services/platform-api/src/database/schema.ts`에 모든 객체를 `pgSchema()`로
명시한다.

### 6.1 schema

```ts
export const finappMarketSchema = pgSchema('finapp_market');
```

### 6.2 `finapp_market_instrument`

| column | type | rule |
|---|---|---|
| `id` | uuid | application-generated PK |
| `symbol` | varchar(12) | unique, 6자리 국내 종목코드 |
| `name` | varchar(120) | 종목 표시명 |
| `market` | varchar(20) | `KOSPI | KOSDAQ` |
| `industry` | varchar(200) nullable | 사람이 읽는 업종명 |
| `standard_code` | varchar(32) nullable | KIS 표준코드 |
| `base_price` | numeric(19,4) nullable | master 기준가 |
| `listed_at` | date nullable | 상장일 |
| `active` | boolean | 기본 true |
| `source` | varchar(20) | `KIS_MASTER` |
| `raw` | jsonb | master 원본 일부, secret 금지 |
| `synced_at` | timestamptz | 마지막 master sync |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

제약/index:

- `finapp_pk_market_instrument`
- `finapp_uq_market_instrument_symbol`
- `finapp_ck_market_instrument_market`
- `finapp_idx_market_instrument_name`
- `finapp_idx_market_instrument_market_symbol`

검색 대상은 약 4,000~5,000건이므로 shared DB에 extension을 추가하지 않는다.
`pg_trgm`을 요구하지 않고 symbol exact/prefix와 name `ILIKE` + limit으로 시작한다.

### 6.3 `finapp_market_quote_snapshot`

| column | type | rule |
|---|---|---|
| `id` | uuid | PK |
| `instrument_id` | uuid | instrument FK, restrict delete |
| `current_price` | numeric(19,4) | not null |
| `change_price` | numeric(19,4) | not null |
| `change_rate` | numeric(10,4) | not null |
| `volume` | bigint | not null, >= 0 |
| `source` | varchar(20) | `KIS` |
| `captured_at` | timestamptz | provider 수집 시각 |
| `raw` | jsonb | allowlist/필요 field만 저장 |

제약/index:

- `finapp_pk_market_quote_snapshot`
- `finapp_fk_market_quote_instrument`
- `finapp_ck_market_quote_values`
- `finapp_idx_market_quote_instrument_captured`

### 6.4 `finapp_market_price_bar`

| column | type | rule |
|---|---|---|
| `id` | uuid | PK |
| `instrument_id` | uuid | instrument FK |
| `interval` | varchar(20) | 5개 허용값 |
| `bucket_at` | timestamptz | 봉 기준 시각 |
| `open` | numeric(19,4) | not null |
| `high` | numeric(19,4) | not null |
| `low` | numeric(19,4) | not null |
| `close` | numeric(19,4) | not null |
| `volume` | bigint | not null, >= 0 |
| `source` | varchar(20) | `KIS` |
| `raw` | jsonb | allowlist/필요 field만 저장 |

제약/index:

- `finapp_pk_market_price_bar`
- `finapp_fk_market_bar_instrument`
- `finapp_uq_market_bar_bucket`
- `finapp_ck_market_bar_interval`
- `finapp_ck_market_bar_ohlc`
- `finapp_idx_market_bar_lookup`

`finapp_ck_market_bar_ohlc`는 최소한 `high >= low`, `volume >= 0`을 검증한다.

## 7. Backend 모듈 구조

다음 파일 구조를 그대로 사용한다.

```text
services/platform-api/src/modules/market/
├── api/
│   └── market.controller.ts
├── application/
│   ├── market.service.ts
│   └── ports/
│       ├── market-data-provider.port.ts
│       └── market-repository.port.ts
├── domain/
│   ├── market-errors.ts
│   └── market-model.ts
├── infrastructure/
│   ├── http/
│   │   └── kis-market-data.adapter.ts
│   └── persistence/
│       └── drizzle-market.repository.ts
└── market.module.ts
```

의존 방향:

```text
controller -> application service -> application ports
                                  <- KIS HTTP adapter
                                  <- Drizzle repository
```

금지:

- controller에서 `fetch`, Drizzle 또는 KIS raw field 직접 사용
- domain/application에서 `pg`, Drizzle, Nest HTTP type import
- KIS 호출 중 DB transaction 유지
- KIS key/secret 로그 출력
- raw request/response 전체 structured log 출력

## 8. KIS adapter 상세

### 8.1 환경변수

backend 전용:

```text
MARKET_DATA_PROVIDER=KIS
KIS_APP_KEY=<secret>
KIS_APP_SECRET=<secret>
KIS_BASE_URL=https://openapi.koreainvestment.com:9443
KIS_HTTP_TIMEOUT_MS=5000
MARKET_QUOTE_FRESH_SECONDS=30
MARKET_BAR_FRESH_SECONDS=300
```

금지:

- `EXPO_PUBLIC_KIS_*`
- 모바일 `.env.local`에 KIS credential 저장
- Git tracked env에 실제 key 저장

### 8.2 access token

- process memory에 token과 expiry를 cache한다.
- 만료 60초 전에 새 token을 발급한다.
- token 발급 실패를 credential 로그 없이 `MARKET_PROVIDER_UNAVAILABLE`로 매핑한다.
- 동시에 여러 요청이 갱신을 시작하지 않도록 single-flight promise를 사용한다.

### 8.3 endpoint mapping

StockTracker의 endpoint를 참고한다.

| 기능 | KIS path | TR ID |
|---|---|---|
| 기본정보 | `/uapi/domestic-stock/v1/quotations/search-stock-info` | `CTPF1002R` |
| 현재가 | `/uapi/domestic-stock/v1/quotations/inquire-price` | `FHKST01010100` |
| 분봉 | `/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice` | `FHKST03010200` |
| 기간봉 | `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice` | `FHKST03010100` |

### 8.4 normalization

- `stck_prpr` -> `currentPrice`
- `prdy_vrss` -> `changePrice`
- `prdy_ctrt` -> `changeRate`
- `acml_vol` -> `volume`
- `stck_oprc` -> `open`
- `stck_hgpr` -> `high`
- `stck_lwpr` -> `low`
- `stck_clpr` 또는 분봉 `stck_prpr` -> `close`
- `stck_bsop_date` + `stck_cntg_hour` -> `bucketAt`

숫자 문자열은 comma 제거 후 canonical decimal string으로 검증한다. `NaN`, 빈 값,
음수 volume과 OHLC 불변식 위반은 저장하지 않는다.

## 9. 종목 마스터 sync

검색은 KIS quote API가 아니라 로컬 종목 마스터에서 수행한다.

### 9.1 입력

- KOSPI master zip
- KOSDAQ master zip
- StockTracker의 고정폭 parsing 구조 참고

### 9.2 실행 방식

- API 서버 startup 시 자동 전체 sync하지 않는다.
- 별도 CLI를 추가한다.

```text
services/platform-api/src/modules/market/infrastructure/sync/kis-stock-master.ts
services/platform-api/src/modules/market/market-sync-cli.ts
```

package script:

```json
"market:sync": "npm run build && node dist/modules/market/market-sync-cli.js"
```

실행은 process environment에서 KIS 설정과 DB URL을 주입한다. `.env.local` 자동
loading을 가정하지 않는다.

### 9.3 idempotency

- `symbol` unique key로 upsert한다.
- 같은 master 파일을 두 번 실행해도 row가 증가하지 않는다.
- master에서 사라진 종목을 즉시 delete하지 않는다. `active=false`로 전환하는 별도
  검토 단계로 둔다.
- 다른 schema/table은 읽거나 쓰지 않는다.

## 10. cache와 외부 호출 정책

### 10.1 현재가

- 최신 snapshot이 30초 이내면 DB cache를 반환한다.
- stale 또는 없음이면 KIS를 한 번 호출한다.
- KIS 성공 후 새 snapshot을 insert한다.
- KIS 실패 + 기존 snapshot 있음: 기존 값과 `STALE` 반환
- KIS 실패 + 기존 snapshot 없음: 503

### 10.2 차트

- interval별 최신 `bucketAt`과 마지막 sync 시각을 확인한다.
- 기본 TTL은 5분이다.
- fresh면 DB 조회만 수행한다.
- stale면 KIS 호출 후 `(instrument_id, interval, bucket_at)` upsert한다.
- 반환은 항상 시간 오름차순이다.

### 10.3 concurrency

- 같은 symbol/interval의 동시 refresh는 process-local single-flight로 합친다.
- 현재 단일 instance 개발/데모 범위에서는 distributed lock을 추가하지 않는다.
- multi-instance로 확장할 때 PostgreSQL advisory lock 또는 별도 lease table을 ADR로
  검토한다.

### 10.4 retry

- 모바일은 quote/chart 요청을 무제한 retry하지 않는다.
- TanStack Query 기본 retry를 endpoint별 최대 1회로 제한한다.
- backend KIS adapter는 timeout/429를 자동 반복 호출하지 않는다.
- 사용자가 명시적으로 `다시 확인`을 누르면 새 요청을 보낸다.

## 11. Mobile 구현 구조

다음 구조를 사용한다.

```text
apps/mobile/src/features/market/
├── api/
│   └── market-query.ts
├── hooks/
│   └── use-market-data.ts
├── model/
│   └── market-display.ts
├── ui/
│   ├── market-screen.tsx
│   └── stock-price-chart.tsx
└── index.ts
```

### 11.1 탭

`apps/mobile/src/app/index.tsx`의 section union에 `market`을 추가한다.

권장 순서:

```text
자산 | 시장 | 주문 | 시뮬레이션 | 설정
```

5개 탭에서 좁은 화면 글자가 잘리지 않도록 font size, padding과 accessibility role을
확인한다.

### 11.2 검색 UX

- 검색어 state는 화면에 둔다.
- 300ms debounce 후 query를 실행한다.
- trim 후 1자 미만이면 요청하지 않는다.
- query key: `['market', 'stocks', normalizedQuery]`
- 이전 요청은 AbortSignal로 취소한다.
- 결과에 종목명, 코드, 시장, 업종을 표시한다.
- 검색 결과 없음, loading, network error를 각각 표시한다.

### 11.3 종목 선택

- 선택 symbol은 화면 local state로 둔다.
- quote와 기본 DAILY bars를 병렬 query한다.
- query key:
  - `['market', 'quote', symbol]`
  - `['market', 'bars', symbol, interval]`
- 검색 결과 목록과 선택 상세가 한 ScrollView 안에서 과도하게 길어지지 않게 한다.

### 11.4 차트

- `CartesianChart` + `Line`을 사용한다.
- x: `bucketAt`
- y: `close`
- 입력 bars는 오름차순이어야 한다.
- invalid decimal row는 chart model mapper에서 제외하고 0으로 바꾸지 않는다.
- empty bars면 `표시할 가격 데이터가 없습니다`를 표시한다.
- reduced motion을 존중한다.
- 접근성 label에 종목명, 기간, 시작/종료 가격을 포함한다.
- tooltip은 첫 구현에서 생략 가능하며 선택 시점 tooltip은 후속 단계다.

### 11.5 표시 문구

- 현재가, 등락, 등락률, 거래량을 한글로 표시한다.
- KIS raw enum/string을 직접 출력하지 않는다.
- `FRESH` -> `최신 데이터`, `STALE` -> `지연 데이터`
- 날짜는 공통 `formatDate`, `formatDateTime`을 사용한다.
- `실시간`, `정확한 수익`, `매수 추천` 표현을 사용하지 않는다.
- 고지 문구: `외부 시세는 지연되거나 일시적으로 제공되지 않을 수 있습니다.`

## 12. Mobile API port 변경

`apps/mobile/src/shared/api/platform-api.ts`에 다음 type/method를 추가한다.

```ts
type MarketInterval = 'MINUTE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface PlatformApi {
  searchMarketStocks(query: string, options?: PlatformRequestOptions): Promise<readonly MarketStock[]>;
  getMarketQuote(symbol: string, options?: PlatformRequestOptions): Promise<MarketQuote>;
  getMarketBars(symbol: string, interval: MarketInterval, options?: PlatformRequestOptions): Promise<MarketBars>;
}
```

반드시 같이 수정할 파일:

- `apps/mobile/src/shared/api/platform-api-contract.ts`
- `apps/mobile/src/shared/api/http-platform-api.ts`
- `apps/mobile/src/shared/api/mock/contract-mock-platform-api.ts`
- `apps/mobile/src/shared/api/unavailable-platform-api.ts`
- `apps/mobile/src/shared/api/mock/fixtures/market-data.success.json`
- 각 adapter/contract test

wire DTO를 화면에서 직접 사용하지 않고 `features/market/model/market-display.ts`에서
차트 숫자와 한글 표시 model로 변환한다.

## 13. OpenAPI와 계약 추적

`contracts/openapi/platform-v1.yaml`에 3개 operation을 additive하게 추가한다.

권장 operationId:

- `searchMarketStocks`
- `getMarketStockQuote`
- `getMarketStockBars`

같은 변경에서 다음을 갱신한다.

- `contracts/operation-coverage.yaml`
- `contracts/fixtures/operation-responses.json`
- `scripts/validate-contract-fixtures.mjs`가 새 fixture를 검증하는지 확인
- backend provider E2E
- mobile consumer fixture/adapter test
- compatibility baseline은 기존 operation을 제거하지 않는다.

OpenAPI lint만 통과한 상태를 완료로 간주하지 않는다.

## 14. Keycloak와 local test auth

`infra/keycloak/finapp-realm.json`에 `market.read` client scope를 추가한다.

- access token scope에 `market.read`가 포함되는지 smoke test한다.
- `services/platform-api/src/core/auth/oidc-jwt.guard.ts`의 local test scope에
  `market.read`를 추가한다.
- controller에 `@RequiredScopes('market.read')`를 사용한다.
- demo/production에서 local test token을 허용하지 않는다.

## 15. 테스트 계획

자동 테스트에서 실제 KIS endpoint를 호출하지 않는다.

### 15.1 Backend unit

- KIS current quote 정상 row normalization
- comma decimal normalization
- 빈 값/NaN/음수 volume 거부
- KIS error code -> domain error mapping
- access token single-flight
- timeout과 429 mapping
- date/time KST parsing
- interval별 KIS parameter/TR ID

### 15.2 Backend repository integration

- instrument upsert idempotency
- quote append와 latest 조회
- bar unique upsert
- chart 오름차순 조회와 limit
- runtime role의 DDL 불가
- 기존 schema 접근 없음
- migration history 증가와 clean DB 재현

### 15.3 Backend E2E

- search 200 / validation 400
- unknown symbol 404
- quote 200 / provider unavailable 503
- stale fallback 200 + STALE
- bars interval 200
- auth header 없음 401
- `market.read` 없음 403
- 모든 성공/problem 응답 OpenAPI schema 검증

### 15.4 Mobile

- search debounce와 AbortSignal
- 검색 결과 한글 표시
- 종목 선택 후 quote/bars query
- interval 변경
- loading/empty/error/stale state
- 숫자/date formatter
- chart invalid row 제외
- 접근성 role/label
- mock mode에서 deterministic 전체 화면 렌더링

### 15.5 실제 KIS 수동 smoke

실제 credential을 process environment에 주입한 승인된 로컬 실행에서만 수행한다.

```text
1. 종목 master sync
2. `삼성` 검색
3. 005930 quote 조회
4. DAILY chart 조회
5. DB quote/bar row 확인
6. credential/log 노출 없음 확인
```

실제 KIS smoke 실패를 unit/contract test 실패와 혼동하지 않는다.

## 16. 구현 순서

Luna는 아래 순서를 바꾸지 않는다. 각 단계가 통과하기 전 다음 단계로 넘어가지
않는다.

### Phase 0 — 문서·계약 기준선

1. 본 문서와 `MVP_SCOPE.md`, `API_CONTRACTS.md`, `TABLE_DEFINITIONS.md`,
   `SECURITY_MODEL.md`, `TEST_STRATEGY.md`를 읽는다.
2. scope/decision 문서에 시장 데이터 기능을 additive하게 반영한다.
3. OpenAPI schema/path와 operation coverage skeleton을 먼저 추가한다.
4. contract lint를 통과시킨다.

완료 조건:

- 3개 operation과 response/problem schema가 canonical contract에 존재한다.
- 기존 operation compatibility가 깨지지 않는다.

### Phase 1 — DB schema와 repository

1. `finappMarketSchema`와 3개 table을 Drizzle schema에 추가한다.
2. 관련 table/data model 문서를 갱신한다.
3. `npm run db:generate -w @finapp/platform-api`를 실행한다.
4. 생성 SQL에서 `DROP`, 기존 schema `ALTER`, `TRUNCATE`가 없는지 검토한다.
5. local/Testcontainers에만 migration을 적용한다.
6. repository와 integration test를 구현한다.

완료 조건:

- clean PostgreSQL migration 성공
- 기존 10개 migration 보존 + 신규 migration 추가
- repository integration test 통과
- 원격 DB 미접속

### Phase 2 — KIS provider와 backend API

1. domain model/error를 구현한다.
2. provider/repository port를 구현한다.
3. KIS fake response 기반 adapter unit test를 먼저 작성한다.
4. KIS adapter와 token cache를 구현한다.
5. application service의 cache/stale 정책을 구현한다.
6. controller와 module을 추가한다.
7. `AppModule`에 `MarketModule`을 등록한다.
8. provider E2E와 OpenAPI response validation을 추가한다.

완료 조건:

- actual KIS 호출 없이 backend test/typecheck/lint/build 통과
- controller가 provider raw를 노출하지 않음
- auth/scope test 통과

### Phase 3 — 종목 master sync

1. StockTracker의 KIS master parser를 참고해 FinancialApp 전용 parser를 작성한다.
2. KOSPI/KOSDAQ fixture zip 또는 최소 고정폭 fixture로 unit test한다.
3. CLI와 package script를 추가한다.
4. 같은 fixture를 두 번 실행해 upsert idempotency를 검증한다.
5. 자동 startup sync가 없는지 확인한다.

완료 조건:

- 검색용 종목 catalog가 local DB에 존재
- 두 번 실행 후 row count 동일
- 삭제 SQL 없음

### Phase 4 — Mobile API adapter

1. mobile API type을 추가한다.
2. contract validator와 fixture를 추가한다.
3. real HTTP adapter를 추가한다.
4. mock/unavailable adapter를 추가한다.
5. adapter/contract test를 통과시킨다.

완료 조건:

- mobile 화면 없이 provider/consumer contract가 먼저 통과
- mock과 real이 같은 application type을 반환

### Phase 5 — 시장 탭과 차트

1. `features/market` 폴더를 만든다.
2. search/quote/bars query와 hook을 만든다.
3. 검색·선택·가격 카드 UI를 만든다.
4. interval selector와 line chart를 만든다.
5. `app/index.tsx`에 `시장` 탭을 연결한다.
6. component/accessibility/error state test를 추가한다.

완료 조건:

- mock mode에서 사용자 시나리오 전체 렌더링
- Android development build에서 chart runtime 확인
- 화면에 KIS raw enum, credential, 영문 상태값 노출 없음

### Phase 6 — 통합·포트폴리오 증거

1. local Compose에 KIS backend env 경계를 추가한다.
2. 실제 KIS 수동 smoke를 별도 승인된 환경에서 실행한다.
3. screenshot과 API trace ID를 기록하되 credential/raw token은 가린다.
4. 아키텍처, 보안, 제한, 데모 문서를 갱신한다.
5. root verify를 실행한다.

완료 조건:

- 검색 -> quote -> chart 실제 흐름 통과
- `npm run verify` 통과
- secret scan 통과
- remote migration/deploy 미실행 사실 기록

## 17. 검증 명령

Phase별 필요한 subset을 먼저 실행하고 마지막에 root gate를 실행한다.

```bash
npm run contract:check
npm run typecheck -w @finapp/platform-api
npm run lint -w @finapp/platform-api
npm run test -w @finapp/platform-api
npm run typecheck -w @finapp/mobile
npm run lint -w @finapp/mobile
npm run test -w @finapp/mobile
npm run architecture:check
npm run security:secrets
npm run verify
```

사용자가 build를 보류한 turn에서는 build를 실행하지 않는다. build 승인 후에만 다음을
실행한다.

```bash
npm run build -w @finapp/platform-api
cd apps/mobile
npx expo export --platform android
npx expo run:android --no-bundler
```

## 18. 위험과 대응

### KIS credential 없음

- blocker: 실제 provider smoke만 BLOCKED
- 계속 가능한 작업: 계약, fake adapter, DB, mock UI, 테스트
- 재개 조건: 사용자가 backend process environment 또는 secret store로 credential 제공

### KIS rate limit

- quote 30초, bars 5분 cache
- 검색은 local DB만 사용
- 자동 polling 금지
- 429를 retryable problem으로 표시

### 장외시간·휴장일

- 마지막 수집시각과 freshness 표시
- 데이터가 변하지 않는 것을 장애로 단정하지 않음
- `실시간` 표시 금지

### provider schema 변경

- KIS raw를 port 밖으로 노출하지 않음
- normalization unit test에 실제 형태의 redacted fixture 사용
- unknown/empty field fail closed

### shared remote DB

- 신규 객체는 `finapp_market`과 `finapp_*`만 허용
- migration 전 read-only catalog 확인
- single migration owner
- `push`, destructive DDL 금지

### 차트 성능

- 화면에는 interval별 최대 40~156개 point만 전달
- render마다 decimal/date parsing 반복하지 않고 mapper에서 한 번 변환
- reduced motion 지원

## 19. 포트폴리오 데모 문구

완료 후 README/포트폴리오에는 다음 수준으로 표현한다.

```text
한국투자증권 KIS Open API를 NestJS provider adapter로 연동하고, 종목 마스터,
현재가와 기간별 시세를 PostgreSQL에 정규화·cache했다. React Native 앱은 서버
계약만 소비하며 외부 credential을 포함하지 않고, 종목 검색과 기간별 가격 차트를
제공한다. provider 장애 시 stale cache와 명시적 최신성 상태로 화면을 유지한다.
```

금지 표현:

- 실시간 거래 시스템
- 실제 증권 주문 연동
- 수익 예측
- 투자 추천
- 대규모 트래픽 운영 경험

## 20. Definition of Done

아래가 모두 충족되어야 완료다.

- [ ] 앱에 `시장` 탭이 있다.
- [ ] 종목명/코드 검색이 동작한다.
- [ ] 현재가와 출처/수집시각/최신성이 표시된다.
- [ ] 5개 interval chart가 동작한다.
- [ ] KIS credential은 backend에만 있다.
- [ ] `market.read` auth가 local/demo/production 정책에 맞게 동작한다.
- [ ] `finapp_market` 이외 신규 schema가 없다.
- [ ] 기존 schema/table에 destructive SQL이 없다.
- [ ] OpenAPI/provider/consumer fixture가 연결된다.
- [ ] backend와 mobile 테스트가 통과한다.
- [ ] 실제 KIS smoke 결과 또는 명시적 credential blocker가 기록된다.
- [ ] secret scan이 통과한다.
- [ ] build 보류 요청이 있으면 build를 실행하지 않는다.
- [ ] 원격 DB migration/deploy는 별도 승인 전 실행하지 않는다.
