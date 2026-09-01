import {
  PlatformApiError,
  type Account,
  type AssetHistoryPoint,
  type AssetSummary,
  type BuyOrderInput,
  type CreateOrderInput,
  type CreateSimulationInput,
  type CurrentUserResponse,
  type DeveloperResetResponse,
  type DeveloperScenarioMode,
  type DeveloperScenarioResponse,
  type Holding,
  type MyDataConnection,
  type MyDataSync,
  type Order,
  type OrderPage,
  type Page,
  type PlatformApi,
  type PlatformHealthResponse,
  type PlatformRequestOptions,
  type Quote,
  type Simulation,
  type Transaction,
} from './platform-api';
import {
  isAccount,
  isAccountPage,
  isConnection,
  isConnections,
  isCurrentUser,
  isDeveloperReset,
  isDeveloperScenario,
  isHistory,
  isHoldingPage,
  isPlatformHealth,
  isOrder,
  isOrderPage,
  isQuote,
  isSimulation,
  isSummary,
  isSync,
  isTransactionPage,
} from './platform-api-contract';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpPlatformApiOptions {
  readonly authenticatedFetch?: FetchLike;
  readonly baseUrl: string;
  readonly fetch?: FetchLike;
  readonly requestId?: () => string;
}

function defaultRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class HttpPlatformApi implements PlatformApi {
  private readonly authenticatedFetch: FetchLike;
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly requestId: () => string;

  constructor(options: HttpPlatformApiOptions) {
    this.authenticatedFetch =
      options.authenticatedFetch ?? options.fetch ?? globalThis.fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetch = options.fetch ?? globalThis.fetch;
    this.requestId = options.requestId ?? defaultRequestId;
  }

  createSimulation(
    input: CreateSimulationInput,
    options: PlatformRequestOptions = {},
  ): Promise<Simulation> {
    return this.requestJson(
      '/api/v1/simulations',
      isSimulation,
      options,
      this.authenticatedFetch,
      input,
    );
  }

  createMyDataConnection(
    consentExpiresAt: string,
    options: PlatformRequestOptions = {},
  ): Promise<MyDataConnection> {
    return this.requestJson(
      '/api/v1/mydata/connections',
      isConnection,
      options,
      this.authenticatedFetch,
      { consentExpiresAt, institutionCode: 'SYNTH_WEALTH_001' },
    );
  }

  createMyDataSync(
    connectionId: string,
    options: PlatformRequestOptions = {},
  ): Promise<MyDataSync> {
    return this.requestJson(
      '/api/v1/mydata/syncs',
      isSync,
      options,
      this.authenticatedFetch,
      { connectionId },
    );
  }

  getAccount(
    accountId: string,
    options: PlatformRequestOptions = {},
  ): Promise<Account> {
    return this.requestJson(
      `/api/v1/accounts/${encodeURIComponent(accountId)}`,
      isAccount,
      options,
      this.authenticatedFetch,
    );
  }

  async getAssetHistory(
    range: '1M' | '3M' | '1Y' | 'ALL' = '1Y',
    options: PlatformRequestOptions = {},
  ): Promise<readonly AssetHistoryPoint[]> {
    const response = await this.requestJson(
      `/api/v1/assets/history?range=${range}`,
      isHistory,
      options,
      this.authenticatedFetch,
    );
    return response.points;
  }

  getAssetSummary(options: PlatformRequestOptions = {}): Promise<AssetSummary> {
    return this.requestJson(
      '/api/v1/assets/summary',
      isSummary,
      options,
      this.authenticatedFetch,
    );
  }

  getCurrentUser(
    options: PlatformRequestOptions = {},
  ): Promise<CurrentUserResponse> {
    return this.requestJson(
      '/api/v1/me',
      isCurrentUser,
      options,
      this.authenticatedFetch,
    );
  }

  async getHealth(
    options: PlatformRequestOptions = {},
  ): Promise<PlatformHealthResponse> {
    return this.requestJson(
      '/api/v1/health',
      isPlatformHealth,
      options,
      this.fetch,
    );
  }

  getMyDataSync(
    syncId: string,
    options: PlatformRequestOptions = {},
  ): Promise<MyDataSync> {
    return this.requestJson(
      `/api/v1/mydata/syncs/${encodeURIComponent(syncId)}`,
      isSync,
      options,
      this.authenticatedFetch,
    );
  }

  getOrder(
    orderId: string,
    options: PlatformRequestOptions = {},
  ): Promise<Order> {
    return this.requestJson(
      `/api/v1/orders/${encodeURIComponent(orderId)}`,
      isOrder,
      options,
      this.authenticatedFetch,
    );
  }

  getSimulation(
    simulationId: string,
    options: PlatformRequestOptions = {},
  ): Promise<Simulation> {
    return this.requestJson(
      `/api/v1/simulations/${encodeURIComponent(simulationId)}`,
      isSimulation,
      options,
      this.authenticatedFetch,
    );
  }

  listAccounts(options: PlatformRequestOptions = {}): Promise<Page<Account>> {
    return this.requestJson(
      '/api/v1/accounts',
      isAccountPage,
      options,
      this.authenticatedFetch,
    );
  }

  listHoldings(
    accountId?: string,
    options: PlatformRequestOptions = {},
  ): Promise<Page<Holding>> {
    const query =
      accountId === undefined
        ? ''
        : `?accountId=${encodeURIComponent(accountId)}`;
    return this.requestJson(
      `/api/v1/holdings${query}`,
      isHoldingPage,
      options,
      this.authenticatedFetch,
    );
  }

  listMyDataConnections(
    options: PlatformRequestOptions = {},
  ): Promise<readonly MyDataConnection[]> {
    return this.requestJson(
      '/api/v1/mydata/connections',
      isConnections,
      options,
      this.authenticatedFetch,
    );
  }

  listOrders(
    cursor?: string,
    limit = 20,
    options: PlatformRequestOptions = {},
  ): Promise<OrderPage> {
    const search = new URLSearchParams({ limit: String(limit) });
    if (cursor !== undefined) search.set('cursor', cursor);
    return this.requestJson(
      `/api/v1/orders?${search.toString()}`,
      isOrderPage,
      options,
      this.authenticatedFetch,
    );
  }

  listTransactions(
    options: PlatformRequestOptions = {},
  ): Promise<Page<Transaction>> {
    return this.requestJson(
      '/api/v1/transactions',
      isTransactionPage,
      options,
      this.authenticatedFetch,
    );
  }

  prepareBuyOrder(
    input: CreateOrderInput,
    idempotencyKey: string,
    options: PlatformRequestOptions = {},
  ): Promise<Order> {
    return this.requestJson(
      '/api/v1/orders',
      isOrder,
      options,
      this.authenticatedFetch,
      input,
      { 'Idempotency-Key': idempotencyKey },
    );
  }

  previewBuyOrder(
    input: BuyOrderInput,
    options: PlatformRequestOptions = {},
  ): Promise<Quote> {
    return this.requestJson(
      '/api/v1/orders/preview',
      isQuote,
      options,
      this.authenticatedFetch,
      input,
    );
  }

  resetDeveloperDataset(
    options: PlatformRequestOptions = {},
  ): Promise<DeveloperResetResponse> {
    return this.requestJson(
      '/api/v1/dev/dataset/reset',
      isDeveloperReset,
      options,
      this.authenticatedFetch,
      undefined,
      {},
      'POST',
    );
  }

  setDeveloperScenario(
    mode: DeveloperScenarioMode,
    options: PlatformRequestOptions = {},
  ): Promise<DeveloperScenarioResponse> {
    return this.requestJson(
      '/api/v1/dev/scenario',
      isDeveloperScenario,
      options,
      this.authenticatedFetch,
      { mode, correlationScope: 'CURRENT_USER' },
      {},
      'PUT',
    );
  }

  private async requestJson<T>(
    path: string,
    validate: (value: unknown) => value is T,
    options: PlatformRequestOptions,
    fetch: FetchLike,
    body?: unknown,
    extraHeaders: Readonly<Record<string, string>> = {},
    methodOverride?: 'POST' | 'PUT',
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...extraHeaders,
          'X-Request-Id': this.requestId(),
        },
        method: methodOverride ?? (body === undefined ? 'GET' : 'POST'),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new PlatformApiError({
        cause: error,
        kind: 'network',
        message: 'Platform API에 연결할 수 없습니다.',
        retryable: true,
      });
    }

    if (!response.ok) {
      let problem: unknown;
      try {
        problem = await response.json();
      } catch {
        // A non-JSON error still maps to the HTTP status below.
      }
      const problemRecord =
        typeof problem === 'object' && problem !== null
          ? (problem as Record<string, unknown>)
          : undefined;
      throw new PlatformApiError({
        ...(typeof problemRecord?.code === 'string'
          ? { code: problemRecord.code }
          : {}),
        kind: 'http',
        message:
          typeof problemRecord?.detail === 'string'
            ? problemRecord.detail
            : 'Platform API가 요청을 처리하지 못했습니다.',
        retryable:
          typeof problemRecord?.retryable === 'boolean'
            ? problemRecord.retryable
            : response.status === 429 || response.status >= 500,
        status: response.status,
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new PlatformApiError({
        cause: error,
        kind: 'contract',
        message: 'Platform API 응답을 읽을 수 없습니다.',
        retryable: false,
      });
    }

    if (!validate(payload)) {
      throw new PlatformApiError({
        kind: 'contract',
        message: 'Platform API 응답이 platform-v1 계약과 일치하지 않습니다.',
        retryable: false,
      });
    }

    return payload;
  }
}
