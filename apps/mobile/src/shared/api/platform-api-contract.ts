import type {
  Account,
  AssetHistoryPoint,
  AssetSummary,
  CurrentUserResponse,
  DeveloperResetResponse,
  DeveloperScenarioResponse,
  Holding,
  MyDataConnection,
  MyDataSync,
  Order,
  OrderPage,
  Page,
  PlatformHealthResponse,
  Quote,
  UserRiskProfile,
  Simulation,
  Transaction,
  MarketBar,
  MarketBars,
  MarketQuote,
  MarketStock,
} from './platform-api';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY = /^-?[0-9]+\.[0-9]{4}$/;
const QUANTITY = /^[0-9]+\.[0-9]{8}$/;
const VERSION = /^\d+$/;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function exact(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => key in value)
  );
}
const text = (value: unknown) => typeof value === 'string' && value.length > 0;
const nullableText = (value: unknown) => value === null || text(value);
const uuid = (value: unknown) => typeof value === 'string' && UUID.test(value);
const money = (value: unknown) =>
  typeof value === 'string' && MONEY.test(value);
const maskedIdentifier = (value: unknown) =>
  typeof value === 'string' && value.includes('*') && value.length > 0;
const count = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
const volume = (value: unknown) =>
  typeof value === 'string' && /^\d+$/.test(value);
const marketInterval = (value: unknown) =>
  ['MINUTE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(String(value));
const marketSource = (value: unknown) =>
  ['KIS', 'LOCAL'].includes(String(value));
const marketFreshness = (value: unknown) =>
  ['FRESH', 'STALE'].includes(String(value));

export function isMarketStock(value: unknown): value is MarketStock {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['symbol', 'name', 'market', 'industry']) &&
    typeof item.symbol === 'string' &&
    /^\d{6}$/.test(item.symbol) &&
    text(item.name) &&
    ['KOSPI', 'KOSDAQ'].includes(String(item.market)) &&
    nullableText(item.industry)
  );
}

export function isMarketStockSearch(
  value: unknown,
): value is { readonly stocks: readonly MarketStock[] } {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['stocks']) &&
    Array.isArray(item.stocks) &&
    item.stocks.length <= 30 &&
    item.stocks.every(isMarketStock)
  );
}

export function isMarketQuote(value: unknown): value is MarketQuote {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'symbol',
      'name',
      'market',
      'industry',
      'currency',
      'currentPrice',
      'changePrice',
      'changeRate',
      'volume',
      'capturedAt',
      'source',
      'freshness',
    ]) &&
    isMarketStock({
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      industry: item.industry,
    }) &&
    item.currency === 'KRW' &&
    money(item.currentPrice) &&
    money(item.changePrice) &&
    money(item.changeRate) &&
    volume(item.volume) &&
    typeof item.capturedAt === 'string' &&
    Number.isFinite(Date.parse(item.capturedAt)) &&
    marketSource(item.source) &&
    marketFreshness(item.freshness)
  );
}

export function isMarketQuoteResponse(
  value: unknown,
): value is { readonly quote: MarketQuote } {
  const item = record(value);
  return !!item && exact(item, ['quote']) && isMarketQuote(item.quote);
}

function isMarketBar(value: unknown): value is MarketBar {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['bucketAt', 'open', 'high', 'low', 'close', 'volume']) &&
    typeof item.bucketAt === 'string' &&
    Number.isFinite(Date.parse(item.bucketAt)) &&
    money(item.open) &&
    money(item.high) &&
    money(item.low) &&
    money(item.close) &&
    volume(item.volume) &&
    Number(item.high) >= Number(item.low)
  );
}

export function isMarketBars(value: unknown): value is MarketBars {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['symbol', 'interval', 'source', 'freshness', 'bars']) &&
    typeof item.symbol === 'string' &&
    /^\d{6}$/.test(item.symbol) &&
    marketInterval(item.interval) &&
    marketSource(item.source) &&
    marketFreshness(item.freshness) &&
    Array.isArray(item.bars) &&
    item.bars.length <= 156 &&
    item.bars.every(isMarketBar)
  );
}

export function isPlatformHealth(
  value: unknown,
): value is PlatformHealthResponse {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['status', 'service', 'datasetVersion']) &&
    item.status === 'ok' &&
    item.service === 'platform-api' &&
    text(item.datasetVersion)
  );
}

export function isCurrentUser(value: unknown): value is CurrentUserResponse {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'userId',
      'displayName',
      'riskProfile',
      'datasetVersion',
      'syntheticData',
    ]) &&
    uuid(item.userId) &&
    text(item.displayName) &&
    ['BALANCED', 'CONSERVATIVE', 'GROWTH'].includes(String(item.riskProfile)) &&
    text(item.datasetVersion) &&
    item.syntheticData === true
  );
}

export function isRiskProfile(value: unknown): value is UserRiskProfile {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'riskLevel',
      'investmentHorizonMonths',
      'monthlyContribution',
      'version',
      'updatedAt',
    ]) &&
    ['BALANCED', 'CONSERVATIVE', 'GROWTH'].includes(String(item.riskLevel)) &&
    Number.isInteger(item.investmentHorizonMonths) &&
    Number(item.investmentHorizonMonths) >= 1 &&
    Number(item.investmentHorizonMonths) <= 600 &&
    money(item.monthlyContribution) &&
    Number(item.monthlyContribution) >= 0 &&
    typeof item.version === 'string' &&
    VERSION.test(item.version) &&
    typeof item.updatedAt === 'string' &&
    Number.isFinite(Date.parse(item.updatedAt))
  );
}

export function isConnection(value: unknown): value is MyDataConnection {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'connectionId',
      'institutionCode',
      'status',
      'consentExpiresAt',
      'lastSuccessfulSyncAt',
    ]) &&
    uuid(item.connectionId) &&
    item.institutionCode === 'SYNTH_WEALTH_001' &&
    ['ACTIVE', 'REVOKED', 'EXPIRED'].includes(String(item.status)) &&
    text(item.consentExpiresAt) &&
    nullableText(item.lastSuccessfulSyncAt)
  );
}

export function isConnections(
  value: unknown,
): value is readonly MyDataConnection[] {
  return Array.isArray(value) && value.length <= 1 && value.every(isConnection);
}

export function isSync(value: unknown): value is MyDataSync {
  const item = record(value);
  const counts = record(item?.counts);
  return (
    !!item &&
    exact(item, [
      'syncId',
      'connectionId',
      'status',
      'createdAt',
      'startedAt',
      'completedAt',
      'counts',
      'errorCode',
    ]) &&
    uuid(item.syncId) &&
    uuid(item.connectionId) &&
    [
      'QUEUED',
      'FETCHING',
      'RAW_STORED',
      'NORMALIZING',
      'COMPLETED',
      'FAILED',
    ].includes(String(item.status)) &&
    text(item.createdAt) &&
    nullableText(item.startedAt) &&
    nullableText(item.completedAt) &&
    !!counts &&
    exact(counts, ['rawRecords', 'accounts', 'holdings', 'transactions']) &&
    count(counts.rawRecords) &&
    count(counts.accounts) &&
    count(counts.holdings) &&
    count(counts.transactions) &&
    nullableText(item.errorCode)
  );
}

export function isSummary(value: unknown): value is AssetSummary {
  const item = record(value);
  const change = record(item?.change);
  return (
    !!item &&
    exact(item, [
      'asOfDate',
      'currency',
      'totalAssets',
      'cash',
      'investments',
      'change',
      'allocation',
      'lastSyncedAt',
    ]) &&
    text(item.asOfDate) &&
    item.currency === 'KRW' &&
    money(item.totalAssets) &&
    money(item.cash) &&
    money(item.investments) &&
    !!change &&
    exact(change, ['amount', 'rate']) &&
    money(change.amount) &&
    typeof change.rate === 'number' &&
    Array.isArray(item.allocation) &&
    item.allocation.every((value) => {
      const allocation = record(value);
      return (
        !!allocation &&
        exact(allocation, ['assetClass', 'amount', 'weight']) &&
        text(allocation.assetClass) &&
        money(allocation.amount) &&
        typeof allocation.weight === 'number' &&
        allocation.weight >= 0 &&
        allocation.weight <= 1
      );
    }) &&
    nullableText(item.lastSyncedAt)
  );
}

export function isAccount(value: unknown): value is Account {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'accountId',
      'institutionCode',
      'maskedAccountNumber',
      'accountType',
      'currency',
      'status',
      'cashBalance',
    ]) &&
    uuid(item.accountId) &&
    text(item.institutionCode) &&
    maskedIdentifier(item.maskedAccountNumber) &&
    text(item.accountType) &&
    text(item.currency) &&
    text(item.status) &&
    money(item.cashBalance)
  );
}

export function isHolding(value: unknown): value is Holding {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'holdingId',
      'accountId',
      'instrumentId',
      'instrumentCode',
      'displayName',
      'assetClass',
      'quantity',
      'averagePrice',
      'marketValue',
      'asOfAt',
    ]) &&
    uuid(item.holdingId) &&
    uuid(item.accountId) &&
    uuid(item.instrumentId) &&
    text(item.instrumentCode) &&
    text(item.displayName) &&
    text(item.assetClass) &&
    text(item.quantity) &&
    money(item.averagePrice) &&
    money(item.marketValue) &&
    text(item.asOfAt)
  );
}

export function isTransaction(value: unknown): value is Transaction {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'transactionId',
      'accountId',
      'transactionType',
      'amount',
      'currency',
      'occurredAt',
    ]) &&
    uuid(item.transactionId) &&
    uuid(item.accountId) &&
    text(item.transactionType) &&
    money(item.amount) &&
    text(item.currency) &&
    text(item.occurredAt)
  );
}

function page<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T,
): value is Page<T> {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['items', 'nextCursor']) &&
    Array.isArray(item.items) &&
    item.items.every(itemGuard) &&
    item.nextCursor === null
  );
}
export const isAccountPage = (value: unknown): value is Page<Account> =>
  page(value, isAccount);
export const isHoldingPage = (value: unknown): value is Page<Holding> =>
  page(value, isHolding);
export const isTransactionPage = (value: unknown): value is Page<Transaction> =>
  page(value, isTransaction);

export function isHistory(
  value: unknown,
): value is { readonly points: readonly AssetHistoryPoint[] } {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['points']) &&
    Array.isArray(item.points) &&
    item.points.length <= 1000 &&
    item.points.every((value) => {
      const point = record(value);
      return (
        !!point &&
        exact(point, ['date', 'totalAssets', 'cash', 'investments']) &&
        text(point.date) &&
        money(point.totalAssets) &&
        money(point.cash) &&
        money(point.investments)
      );
    })
  );
}

function isPercentiles(value: unknown) {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['p10', 'p50', 'p90']) &&
    money(item.p10) &&
    money(item.p50) &&
    money(item.p90) &&
    Number(item.p10) <= Number(item.p50) &&
    Number(item.p50) <= Number(item.p90)
  );
}

export function isSimulation(value: unknown): value is Simulation {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'simulationId',
      'engineVersion',
      'assumptionSetVersion',
      'currency',
      'goalProbability',
      'finalValue',
      'series',
      'disclaimer',
    ]) &&
    uuid(item.simulationId) &&
    item.engineVersion === '1.0.0' &&
    item.assumptionSetVersion === 'SYNTHETIC_V1' &&
    item.currency === 'KRW' &&
    typeof item.goalProbability === 'number' &&
    item.goalProbability >= 0 &&
    item.goalProbability <= 1 &&
    isPercentiles(item.finalValue) &&
    Array.isArray(item.series) &&
    item.series.length >= 2 &&
    item.series.length <= 601 &&
    item.series.every((value) => {
      const point = record(value);
      return (
        !!point &&
        exact(point, ['month', 'p10', 'p50', 'p90']) &&
        Number.isInteger(point.month) &&
        Number(point.month) >= 0 &&
        Number(point.month) <= 600 &&
        isPercentiles({ p10: point.p10, p50: point.p50, p90: point.p90 })
      );
    }) &&
    item.disclaimer ===
      'Synthetic financial simulation for technical demonstration only.'
  );
}

export function isQuote(value: unknown): value is Quote {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'quoteId',
      'side',
      'quantity',
      'unitPrice',
      'estimatedAmount',
      'fee',
      'currency',
      'expiresAt',
      'syntheticQuote',
    ]) &&
    uuid(item.quoteId) &&
    item.side === 'BUY' &&
    typeof item.quantity === 'string' &&
    QUANTITY.test(item.quantity) &&
    money(item.unitPrice) &&
    money(item.estimatedAmount) &&
    money(item.fee) &&
    item.currency === 'KRW' &&
    text(item.expiresAt) &&
    item.syntheticQuote === true
  );
}

export function isOrder(value: unknown): value is Order {
  const item = record(value);
  return (
    !!item &&
    exact(item, [
      'orderId',
      'status',
      'side',
      'quantity',
      'estimatedAmount',
      'filledAmount',
      'createdAt',
      'updatedAt',
      'statusRefreshRecommendedAfterMs',
    ]) &&
    uuid(item.orderId) &&
    ['PENDING_SUBMISSION', 'UNKNOWN', 'FILLED', 'REJECTED', 'FAILED'].includes(
      String(item.status),
    ) &&
    item.side === 'BUY' &&
    typeof item.quantity === 'string' &&
    QUANTITY.test(item.quantity) &&
    money(item.estimatedAmount) &&
    (item.filledAmount === null || money(item.filledAmount)) &&
    text(item.createdAt) &&
    text(item.updatedAt) &&
    (item.statusRefreshRecommendedAfterMs === null ||
      item.statusRefreshRecommendedAfterMs === 2000)
  );
}

export function isOrderPage(value: unknown): value is OrderPage {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['items', 'nextCursor']) &&
    Array.isArray(item.items) &&
    item.items.every(isOrder) &&
    (item.nextCursor === null || uuid(item.nextCursor))
  );
}

const DEVELOPER_SCENARIOS = [
  'NORMAL',
  'TIMEOUT',
  'HTTP_500',
  'MALFORMED_RESPONSE',
  'ORDER_REJECT',
  'ORDER_UNKNOWN_THEN_FILLED',
] as const;

export function isDeveloperScenario(
  value: unknown,
): value is DeveloperScenarioResponse {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['mode', 'scope']) &&
    DEVELOPER_SCENARIOS.includes(
      item.mode as (typeof DEVELOPER_SCENARIOS)[number],
    ) &&
    item.scope === 'GLOBAL'
  );
}

export function isDeveloperReset(
  value: unknown,
): value is DeveloperResetResponse {
  const item = record(value);
  return (
    !!item &&
    exact(item, ['datasetVersion', 'scenarioMode', 'syntheticData']) &&
    text(item.datasetVersion) &&
    item.scenarioMode === 'NORMAL' &&
    item.syntheticData === true
  );
}
