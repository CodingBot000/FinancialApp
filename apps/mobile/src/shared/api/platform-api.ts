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

export interface PlatformApi {
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
}

export type PlatformApiErrorKind =
  'configuration' | 'contract' | 'http' | 'network' | 'timeout';

export class PlatformApiError extends Error {
  readonly kind: PlatformApiErrorKind;
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor({
    cause,
    kind,
    message,
    retryable,
    status,
  }: {
    readonly cause?: unknown;
    readonly kind: PlatformApiErrorKind;
    readonly message: string;
    readonly retryable: boolean;
    readonly status?: number;
  }) {
    super(message, { cause });
    this.name = 'PlatformApiError';
    this.kind = kind;
    this.retryable = retryable;
    this.status = status;
  }
}
