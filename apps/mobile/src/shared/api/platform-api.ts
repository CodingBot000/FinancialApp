export const PLATFORM_CONTRACT_VERSION = 'platform-v1' as const;

export interface PlatformRequestOptions {
  readonly signal?: AbortSignal;
}

export interface PlatformHealthResponse {
  readonly datasetVersion: string;
  readonly service: 'platform-api';
  readonly status: 'ok';
}

export type RiskProfile = 'BALANCED' | 'CONSERVATIVE' | 'GROWTH';

export interface CurrentUserResponse {
  readonly datasetVersion: string;
  readonly displayName: string;
  readonly riskProfile: RiskProfile;
  readonly syntheticData: true;
  readonly userId: string;
}

export type Money = string;
export type SyncStatus =
  'QUEUED' | 'FETCHING' | 'RAW_STORED' | 'NORMALIZING' | 'COMPLETED' | 'FAILED';

export interface MyDataConnection {
  readonly connectionId: string;
  readonly consentExpiresAt: string;
  readonly institutionCode: 'SYNTH_WEALTH_001';
  readonly lastSuccessfulSyncAt: string | null;
  readonly status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

export interface MyDataSync {
  readonly completedAt: string | null;
  readonly connectionId: string;
  readonly counts: Readonly<{
    accounts: number;
    holdings: number;
    rawRecords: number;
    transactions: number;
  }>;
  readonly createdAt: string;
  readonly errorCode: string | null;
  readonly startedAt: string | null;
  readonly status: SyncStatus;
  readonly syncId: string;
}

export interface Allocation {
  readonly amount: Money;
  readonly assetClass: string;
  readonly weight: number;
}

export interface AssetSummary {
  readonly allocation: readonly Allocation[];
  readonly asOfDate: string;
  readonly cash: Money;
  readonly change: Readonly<{ amount: Money; rate: number }>;
  readonly currency: 'KRW';
  readonly investments: Money;
  readonly lastSyncedAt: string | null;
  readonly totalAssets: Money;
}

export interface Account {
  readonly accountId: string;
  readonly accountType: string;
  readonly cashBalance: Money;
  readonly currency: string;
  readonly institutionCode: string;
  readonly maskedAccountNumber: string;
  readonly status: string;
}

export interface Holding {
  readonly accountId: string;
  readonly asOfAt: string;
  readonly assetClass: string;
  readonly averagePrice: Money;
  readonly displayName: string;
  readonly holdingId: string;
  readonly instrumentId: string;
  readonly instrumentCode: string;
  readonly marketValue: Money;
  readonly quantity: string;
}

export interface Transaction {
  readonly accountId: string;
  readonly amount: Money;
  readonly currency: string;
  readonly occurredAt: string;
  readonly transactionId: string;
  readonly transactionType: string;
}

export interface AssetHistoryPoint {
  readonly cash: Money;
  readonly date: string;
  readonly investments: Money;
  readonly totalAssets: Money;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: null;
}

export type SimulationAssetClass = 'BOND' | 'CASH' | 'EQUITY';

export interface CreateSimulationInput {
  readonly allocation: readonly Readonly<{
    assetClass: SimulationAssetClass;
    weight: number;
  }>[];
  readonly durationMonths: number;
  readonly initialAssets: string;
  readonly monthlyContribution: string;
  readonly targetAmount: string;
}

export interface SimulationPercentiles {
  readonly p10: Money;
  readonly p50: Money;
  readonly p90: Money;
}

export interface SimulationPoint extends SimulationPercentiles {
  readonly month: number;
}

export interface Simulation {
  readonly assumptionSetVersion: 'SYNTHETIC_V1';
  readonly currency: 'KRW';
  readonly disclaimer: 'Synthetic financial simulation for technical demonstration only.';
  readonly engineVersion: '1.0.0';
  readonly finalValue: SimulationPercentiles;
  readonly goalProbability: number;
  readonly series: readonly SimulationPoint[];
  readonly simulationId: string;
}

export interface BuyOrderInput {
  readonly accountId: string;
  readonly instrumentId: string;
  readonly quantity: string;
  readonly side: 'BUY';
}

export interface CreateOrderInput extends BuyOrderInput {
  readonly quoteId: string;
}

export interface Quote {
  readonly currency: 'KRW';
  readonly estimatedAmount: Money;
  readonly expiresAt: string;
  readonly fee: Money;
  readonly quantity: string;
  readonly quoteId: string;
  readonly side: 'BUY';
  readonly syntheticQuote: true;
  readonly unitPrice: Money;
}

export type OrderStatus =
  'FAILED' | 'FILLED' | 'PENDING_SUBMISSION' | 'REJECTED' | 'UNKNOWN';

export interface Order {
  readonly createdAt: string;
  readonly estimatedAmount: Money;
  readonly filledAmount: Money | null;
  readonly orderId: string;
  readonly quantity: string;
  readonly side: 'BUY';
  readonly status: OrderStatus;
  readonly statusRefreshRecommendedAfterMs: 2000 | null;
  readonly updatedAt: string;
}

export interface OrderPage {
  readonly items: readonly Order[];
  readonly nextCursor: string | null;
}

export interface PlatformApi {
  createSimulation(
    input: CreateSimulationInput,
    options?: PlatformRequestOptions,
  ): Promise<Simulation>;
  createMyDataConnection(
    consentExpiresAt: string,
    options?: PlatformRequestOptions,
  ): Promise<MyDataConnection>;
  createMyDataSync(
    connectionId: string,
    options?: PlatformRequestOptions,
  ): Promise<MyDataSync>;
  getAccount(
    accountId: string,
    options?: PlatformRequestOptions,
  ): Promise<Account>;
  getAssetHistory(
    range?: '1M' | '3M' | '1Y' | 'ALL',
    options?: PlatformRequestOptions,
  ): Promise<readonly AssetHistoryPoint[]>;
  getAssetSummary(options?: PlatformRequestOptions): Promise<AssetSummary>;
  getCurrentUser(
    options?: PlatformRequestOptions,
  ): Promise<CurrentUserResponse>;
  getHealth(options?: PlatformRequestOptions): Promise<PlatformHealthResponse>;
  getMyDataSync(
    syncId: string,
    options?: PlatformRequestOptions,
  ): Promise<MyDataSync>;
  getSimulation(
    simulationId: string,
    options?: PlatformRequestOptions,
  ): Promise<Simulation>;
  getOrder(orderId: string, options?: PlatformRequestOptions): Promise<Order>;
  listAccounts(options?: PlatformRequestOptions): Promise<Page<Account>>;
  listHoldings(
    accountId?: string,
    options?: PlatformRequestOptions,
  ): Promise<Page<Holding>>;
  listMyDataConnections(
    options?: PlatformRequestOptions,
  ): Promise<readonly MyDataConnection[]>;
  listTransactions(
    options?: PlatformRequestOptions,
  ): Promise<Page<Transaction>>;
  listOrders(
    cursor?: string,
    limit?: number,
    options?: PlatformRequestOptions,
  ): Promise<OrderPage>;
  prepareBuyOrder(
    input: CreateOrderInput,
    idempotencyKey: string,
    options?: PlatformRequestOptions,
  ): Promise<Order>;
  previewBuyOrder(
    input: BuyOrderInput,
    options?: PlatformRequestOptions,
  ): Promise<Quote>;
}

export type PlatformApiErrorKind =
  'configuration' | 'contract' | 'http' | 'network' | 'timeout';

export class PlatformApiError extends Error {
  readonly code: string | undefined;
  readonly kind: PlatformApiErrorKind;
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor({
    cause,
    code,
    kind,
    message,
    retryable,
    status,
  }: {
    readonly cause?: unknown;
    readonly code?: string;
    readonly kind: PlatformApiErrorKind;
    readonly message: string;
    readonly retryable: boolean;
    readonly status?: number;
  }) {
    super(message, { cause });
    this.name = 'PlatformApiError';
    this.code = code;
    this.kind = kind;
    this.retryable = retryable;
    this.status = status;
  }
}
