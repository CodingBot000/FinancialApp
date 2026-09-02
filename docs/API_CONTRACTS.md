# API 계약 v0

- 상태: Milestone 1~5 구현 기준선
- 작성일: 2026-09-01
- API version: `v1`

이 문서는 구현 전 계약 초안이다. 실제 controller와 OpenAPI가 이 문서와 다르면 같은 변경에서 문서를 갱신한다.

## 0. Canonical 계약 검증과 추적

- canonical artifact는 `contracts/openapi/platform-v1.yaml`과 `contracts/openapi/institution-simulator-v1.yaml`이다.
- `contracts/operation-coverage.yaml`은 모든 operation의 controller handler, provider test, consumer fixture와 adapter 구현/계획 상태를 추적한다.
- `contracts/fixtures/operation-responses.json`은 현재 operation마다 최소 하나의 성공 consumer fixture와 주요 ProblemDetails fixture를 제공한다.
- 실제 NestJS/Fastify provider E2E는 canonical response schema를 직접 검증한다. service unit test 또는 OpenAPI lint만으로 provider 일치를 주장하지 않는다.
- root `npm run contract:check`는 controller route와 OpenAPI operation의 양방향 일치, response schema 존재, fixture 검증과 compatibility baseline을 함께 검사한다.
- `contracts/openapi/compatibility-baseline.yaml`에 있는 operation path/status와 schema/property를 제거하거나 이동하면 gate가 실패한다. 의도한 호환 불가 변경은 새 API version과 migration/consumer 계획을 먼저 승인한다.

## 1. 공통 규칙

### Base URL

- Platform API: `/api/v1`
- Simulator API: `/sim/v1`
- Developer API: `/api/v1/dev`

### Health와 private monitoring

- `GET /api/v1/health`는 process liveness를 반환한다.
- `GET /api/v1/health/ready`는 application DB probe가 timeout 안에 성공하면 `200 ready`, 실패하면 stable body의 `503 not_ready`를 반환한다.
- `GET /api/v1/health/metrics`는 process-local HTTP/external circuit counter와 PostgreSQL pool gauge만 반환한다. 이 endpoint는 private monitoring ingress 전용이며 public demo proxy나 mobile consumer에 노출하지 않는다.
- readiness와 metrics는 인증하지 않으므로 응답에 token, subject, IP, query, resource ID나 business amount를 포함하지 않는다.
- quote preview에서 synthetic market circuit이 open이면 canonical `503 UPSTREAM_CIRCUIT_OPEN`을 반환한다. 주문 POST는 circuit breaker를 이유로 자동 retry하지 않는다.

### 인증

- Platform API는 health를 제외하고 Bearer access token이 필요하다.
- Simulator API는 public internet에 노출하지 않는다.
- Developer API는 `local`에서만 완화할 수 있고 `demo`에서는 `scenario.admin` scope가 필요하다.
- `production` module에는 Developer controller/provider를 등록하지 않는다.

### 공통 Header

| Header | 방향 | 필수 | 설명 |
|---|---|---:|---|
| `Authorization` | client → API | 보호 API | `Bearer <access_token>` |
| `X-Request-Id` | client → API | 권장 | 모바일이 생성한 UUID/ULID |
| `X-Correlation-Id` | API ↔ simulator | 서버 생성 가능 | 서비스 간 추적 ID |
| `Idempotency-Key` | client → API | 주문 POST | UUID |
| `Content-Type` | 양방향 | body 존재 시 | `application/json` |

서버는 응답에 `X-Request-Id`와 `X-Correlation-Id`를 가능한 한 반환한다.

### 타입

- money: JSON string decimal, 예: `"185400000.00"`
- quantity: JSON string decimal, 예: `"3.25000000"`
- percentage/probability: `0.0`~`1.0` number
- timestamp: ISO-8601 UTC, 예: `2026-09-01T10:00:00Z`
- date: ISO-8601 date, 예: `2026-09-01`
- ID: UUID string
- currency: ISO 4217 3자리 코드, MVP는 `KRW`

### 표준 오류

```json
{
  "type": "https://wealth-sandbox.local/problems/validation-failed",
  "title": "Validation failed",
  "status": 400,
  "code": "VALIDATION_FAILED",
  "detail": "One or more fields are invalid.",
  "traceId": "01J...",
  "retryable": false,
  "fieldErrors": [
    {
      "field": "quantity",
      "code": "POSITIVE_REQUIRED",
      "message": "Quantity must be greater than zero."
    }
  ]
}
```

`detail`은 내부 exception, SQL, remote payload를 포함하지 않는다. 모바일은 `code`를 기준으로 UX를 결정한다.

### Pagination

MVP 목록은 cursor 방식을 사용한다.

```json
{
  "items": [],
  "page": {
    "nextCursor": null,
    "hasNext": false
  }
}
```

## 2. Scope

| Scope | API |
|---|---|
| `financial.read` | me, assets, accounts, holdings, sync 상태, order 조회 |
| `financial.write` | connection 생성, manual sync |
| `simulation.execute` | simulation 생성과 조회 |
| `order.execute` | quote preview와 BUY order |
| `market.read` | 외부 주식 종목 검색, 현재가와 기간별 차트 |
| `scenario.admin` | demo developer scenario와 reset |

모든 사용자 소유 resource는 scope 검사 후 ownership을 추가로 검사한다.

## 3. User API

### `GET /api/v1/me`

필요 scope: `financial.read`

응답 `200`:

```json
{
  "userId": "4e34157c-f4fa-4f77-aeaf-19ea60ec6806",
  "displayName": "테스트 사용자 A",
  "riskProfile": "BALANCED",
  "datasetVersion": "FINANCIAL_APP_DATASET_V1",
  "syntheticData": true
}
```

## 4. Market API

필요 scope: `market.read`

```text
GET /api/v1/market/stocks?q=삼성&limit=30
GET /api/v1/market/stocks/{symbol}/quote
GET /api/v1/market/stocks/{symbol}/bars?interval=DAILY
```

종목 검색은 FinancialApp 전용 `finapp_market` catalog를 사용하고, 현재가와
차트는 backend provider가 KIS 응답을 canonical decimal string으로 정규화한다.
`MINUTE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` interval을 지원한다. provider
장애 시 저장된 값이 있으면 `freshness: STALE`, 저장된 값도 없으면 `503`을
반환한다. 상세 schema와 status는 `contracts/openapi/platform-v1.yaml`을
canonical source로 사용한다.

### `GET|PUT /api/v1/me/risk-profile`

- GET은 `financial.read`, PUT은 `financial.write` scope가 필요하다.
- URL/body에 user ID를 받지 않고 검증된 OIDC principal의 내부 user만 조회·수정한다.
- PUT body는 `riskLevel`, 1~600개월 `investmentHorizonMonths`, non-negative decimal `monthlyContribution`과 string `expectedVersion` 전체를 보낸다.
- stale version은 `409 VERSION_CONFLICT`, 형식/범위 오류는 `400 VALIDATION_FAILED`다.
- 응답은 현재 값, 증가한 string `version`과 `updatedAt`을 반환한다. 이 API는 planning preference만 저장하며 portfolio recommendation을 반환하지 않는다.

최초 유효 token 요청 시 OIDC subject를 기준으로 내부 user를 idempotent하게 provision할 수 있다.

## 5. MyData API

MVP는 한 사용자당 활성 connection 하나와 단일 기관 `SYNTH_WEALTH_001`만 지원한다.

### `POST /api/v1/mydata/connections`

필요 scope: `financial.write`

요청:

```json
{
  "institutionCode": "SYNTH_WEALTH_001",
  "consentExpiresAt": "2027-09-01T00:00:00Z"
}
```

응답 `201`:

```json
{
  "connectionId": "44fc3d1c-cd8f-46ba-833f-96dac39dddfd",
  "institutionCode": "SYNTH_WEALTH_001",
  "status": "ACTIVE",
  "consentExpiresAt": "2027-09-01T00:00:00Z",
  "lastSuccessfulSyncAt": null
}
```

같은 사용자와 기관의 활성 connection이 있으면 `409 MYDATA_CONNECTION_ALREADY_EXISTS`를 반환한다.

### `GET /api/v1/mydata/connections`

필요 scope: `financial.read`

응답 `200`: connection 배열. MVP에서는 0개 또는 1개다.

### `POST /api/v1/mydata/syncs`

필요 scope: `financial.write`

요청:

```json
{
  "connectionId": "44fc3d1c-cd8f-46ba-833f-96dac39dddfd"
}
```

응답 `202`:

```json
{
  "syncId": "4467ac44-cf36-449a-b9f9-2b29924a6212",
  "status": "QUEUED",
  "createdAt": "2026-09-01T10:00:00Z"
}
```

동일 connection에 실행 중인 sync가 있으면 새 job을 만들지 않고 기존 `syncId`와 `200`을 반환한다.

### `GET /api/v1/mydata/syncs/{syncId}`

필요 scope: `financial.read`

상태:

```text
QUEUED → FETCHING → RAW_STORED → NORMALIZING → COMPLETED
                                                ↘ FAILED
```

응답 `200`:

```json
{
  "syncId": "4467ac44-cf36-449a-b9f9-2b29924a6212",
  "connectionId": "44fc3d1c-cd8f-46ba-833f-96dac39dddfd",
  "status": "COMPLETED",
  "startedAt": "2026-09-01T10:00:01Z",
  "completedAt": "2026-09-01T10:00:02Z",
  "counts": {
    "rawRecords": 24,
    "accounts": 3,
    "holdings": 8,
    "transactions": 13
  },
  "errorCode": null
}
```

## 6. Asset API

### `GET /api/v1/assets/summary`

필요 scope: `financial.read`

```json
{
  "asOfDate": "2026-09-01",
  "currency": "KRW",
  "totalAssets": "185400000.00",
  "cash": "15400000.00",
  "investments": "170000000.00",
  "change": {
    "amount": "420000.00",
    "rate": 0.00227
  },
  "allocation": [
    {
      "assetClass": "CASH",
      "amount": "15400000.00",
      "weight": 0.0831
    },
    {
      "assetClass": "EQUITY",
      "amount": "92000000.00",
      "weight": 0.4962
    }
  ],
  "lastSyncedAt": "2026-09-01T10:00:02Z"
}
```

### `GET /api/v1/accounts?cursor=&limit=20`

필요 scope: `financial.read`

계좌 응답에는 `maskedAccountNumber`만 포함한다. full identifier를 반환하지 않는다.

### `GET /api/v1/accounts/{accountId}`

필요 scope: `financial.read`와 ownership

다른 사용자 계좌는 존재 여부를 노출하지 않도록 `404 RESOURCE_NOT_FOUND`를 반환한다.

### `GET /api/v1/holdings?accountId=&cursor=&limit=50`

각 holding은 표시용 `instrumentCode`와 주문 preview에 사용할 불투명 UUID `instrumentId`를 함께 반환한다. client는 code를 ID로 추측하거나 DB를 직접 조회하지 않는다.

필요 scope: `financial.read`와 ownership

### `GET /api/v1/assets/history?range=1M|3M|1Y|ALL`

필요 scope: `financial.read`

응답 point는 날짜 오름차순이며 같은 날짜가 중복되지 않는다. `1Y`는 최대 366 points, `ALL`은 서버에서 downsample한다.

## 7. Simulation API

### `POST /api/v1/simulations`

필요 scope: `simulation.execute`

요청:

```json
{
  "initialAssets": "185400000.00",
  "monthlyContribution": "1500000.00",
  "durationMonths": 120,
  "targetAmount": "450000000.00",
  "allocation": [
    { "assetClass": "CASH", "weight": 0.10 },
    { "assetClass": "BOND", "weight": 0.30 },
    { "assetClass": "EQUITY", "weight": 0.60 }
  ]
}
```

서버가 seed를 생성하고 저장한다. test/debug 이외에는 client가 seed를 지정하지 않는다.

응답 `201`:

```json
{
  "simulationId": "df4ee3a2-df76-454e-9627-57fcafda7f8d",
  "engineVersion": "1.0.0",
  "assumptionSetVersion": "SYNTHETIC_V1",
  "currency": "KRW",
  "goalProbability": 0.71,
  "finalValue": {
    "p10": "338200000.00",
    "p50": "426300000.00",
    "p90": "548100000.00"
  },
  "series": [
    {
      "month": 0,
      "p10": "185400000.00",
      "p50": "185400000.00",
      "p90": "185400000.00"
    }
  ],
  "disclaimer": "Synthetic financial simulation for technical demonstration only."
}
```

검증:

- 금액은 0 이상
- `1 <= durationMonths <= 600`
- allocation weight 합은 허용오차 내 1.0
- 알려진 asset class만 허용

### `GET /api/v1/simulations/{simulationId}`

필요 scope: `simulation.execute`와 ownership

## 8. Trading API

### `POST /api/v1/orders/preview`

필요 scope: `order.execute`

요청:

```json
{
  "accountId": "688c601b-ab70-4683-9dd4-6a1174550653",
  "instrumentId": "c805563c-148c-4451-8a9a-4808da7b32ae",
  "side": "BUY",
  "quantity": "3.00000000"
}
```

응답 `201`:

```json
{
  "quoteId": "d228553f-f10a-47ad-89f6-77be8e034324",
  "side": "BUY",
  "quantity": "3.00000000",
  "unitPrice": "125000.00",
  "estimatedAmount": "375000.00",
  "fee": "0.00",
  "currency": "KRW",
  "expiresAt": "2026-09-01T10:01:00Z",
  "syntheticQuote": true
}
```

### `POST /api/v1/orders`

필요 scope: `order.execute`

필수 header: `Idempotency-Key`

요청:

```json
{
  "quoteId": "d228553f-f10a-47ad-89f6-77be8e034324",
  "accountId": "688c601b-ab70-4683-9dd4-6a1174550653",
  "instrumentId": "c805563c-148c-4451-8a9a-4808da7b32ae",
  "side": "BUY",
  "quantity": "3.00000000"
}
```

응답:

- `201`: 처음 생성된 주문이며 FILLED 또는 REJECTED 결과가 명확함
- `202`: UNKNOWN이며 reconciliation 진행 중
- `200`: 같은 key와 같은 payload의 기존 결과
- `409 IDEMPOTENCY_CONFLICT`: 같은 key와 다른 payload

cash reservation transaction이 commit된 뒤 simulator POST를 정확히 한 번 호출한다. 외부 POST는 자동 retry하지 않으며 timeout/5xx/malformed 응답은 `UNKNOWN`과 reconciliation job으로 저장한다. 같은 idempotency key replay는 immutable 최초 snapshot이 아니라 현재 owner-scoped order 상태를 반환한다.

```json
{
  "orderId": "23df8759-92ef-45fc-8015-ef891e4e8757",
  "status": "UNKNOWN",
  "side": "BUY",
  "quantity": "3.00000000",
  "estimatedAmount": "375000.00",
  "filledAmount": null,
  "createdAt": "2026-09-01T10:00:20Z",
  "updatedAt": "2026-09-01T10:00:23Z",
  "statusRefreshRecommendedAfterMs": 2000
}
```

### `GET /api/v1/orders/{orderId}`

필요 scope: `financial.read`와 ownership

상태:

```text
CREATED
  → FUNDS_RESERVED
  → PENDING_SUBMISSION
      → FILLED
      → REJECTED
      → UNKNOWN → FILLED | REJECTED | FAILED
```

### `GET /api/v1/orders?cursor=&limit=20`

필요 scope: `financial.read`

`cursor`는 직전 page 마지막 `orderId`이며 `limit`은 1~100이다. 응답은 `{ items, nextCursor }`이고 모든 항목은 현재 사용자 ownership으로 제한한다.

## 9. Developer API

### `PUT /api/v1/dev/scenario`

`local` 또는 `demo` 전용. demo 필요 scope: `scenario.admin`.

```json
{
  "mode": "ORDER_UNKNOWN_THEN_FILLED",
  "correlationScope": "CURRENT_USER"
}
```

허용 mode:

```text
NORMAL
TIMEOUT
HTTP_500
MALFORMED_RESPONSE
ORDER_REJECT
ORDER_UNKNOWN_THEN_FILLED
```

### `POST /api/v1/dev/dataset/reset`

`local` 또는 `demo` 전용. reset은 simulator admin API를 호출하며 production에서는 route가 존재하지 않는다.

## 10. Simulator API

Simulator 계약은 platform 내부 model과 분리한다.

```text
GET  /sim/v1/mydata/customers/{externalCustomerId}/accounts
GET  /sim/v1/mydata/customers/{externalCustomerId}/holdings
GET  /sim/v1/mydata/customers/{externalCustomerId}/transactions
GET  /sim/v1/market/instruments
GET  /sim/v1/market/prices?instrumentIds=...
GET  /sim/v1/market/history?instrumentId=...&range=...
POST /sim/v1/brokerage/orders
GET  /sim/v1/brokerage/orders/by-client-order-id/{clientOrderId}
PUT  /sim/v1/admin/scenario
POST /sim/v1/admin/reset
```

주문 submit 요청에는 platform의 `clientOrderId`가 필수다. simulator는 동일 clientOrderId와 동일 payload에는 기존 결과를 반환하고, 다른 payload에는 conflict를 반환한다.

시세는 deterministic seed의 latest price를 반환하며 platform quote adapter는 GET만 timeout 범위 안에서 호출한다. 주문 POST는 자동 retry하지 않는다. `ORDER_UNKNOWN_THEN_FILLED`는 최초 submit에서 `UNKNOWN`, client order status 조회에서 동일 external order를 `FILLED`로 결정적으로 전이한다.

admin scenario는 `NORMAL`, `TIMEOUT`, `HTTP_500`, `MALFORMED_RESPONSE`, `ORDER_REJECT`, `ORDER_UNKNOWN_THEN_FILLED`만 허용한다. reset은 주문과 scenario/시세 상태를 합성 기준선으로 되돌린다. production에서는 admin 요청이 404이고 상태를 변경하지 않으며 simulator API 자체는 public internet에 노출하지 않는다.

## 11. 안정적인 오류 코드

최소 오류 코드:

```text
AUTH_TOKEN_INVALID
AUTH_SESSION_EXPIRED
AUTH_SCOPE_MISSING
RESOURCE_NOT_FOUND
VALIDATION_FAILED
MYDATA_CONNECTION_ALREADY_EXISTS
MYDATA_SYNC_ALREADY_RUNNING
MYDATA_EXTERNAL_TIMEOUT
MYDATA_EXTERNAL_INVALID_RESPONSE
SIMULATION_INVALID_ALLOCATION
ORDER_QUOTE_EXPIRED
ORDER_INSUFFICIENT_FUNDS
ORDER_UNKNOWN
ORDER_EXTERNAL_REJECTED
IDEMPOTENCY_CONFLICT
EXTERNAL_SERVICE_UNAVAILABLE
MARKET_STOCK_NOT_FOUND
MARKET_RATE_LIMITED
MARKET_DATA_INVALID
MARKET_PROVIDER_UNAVAILABLE
DEV_SCENARIO_FORBIDDEN
```
