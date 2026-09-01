import {
  PlatformApiError,
  type Account,
  type AssetHistoryPoint,
  type AssetSummary,
  type CurrentUserResponse,
  type Holding,
  type MyDataConnection,
  type MyDataSync,
  type Page,
  type PlatformApi,
  type PlatformHealthResponse,
  type PlatformRequestOptions,
  type Transaction,
} from '../platform-api';
import currentUserFixture from './fixtures/current-user.success.json';
import fixture from './fixtures/platform-health.success.json';
import wealthFixture from './fixtures/wealth-dashboard.success.json';

const platformHealthFixture = fixture as PlatformHealthResponse;
const currentUser = currentUserFixture as CurrentUserResponse;
const wealth = wealthFixture as unknown as {
  accounts: readonly Account[];
  connection: MyDataConnection;
  history: readonly AssetHistoryPoint[];
  holdings: readonly Holding[];
  summary: AssetSummary;
  sync: MyDataSync;
  transactions: readonly Transaction[];
};

export type ContractMockHealthScenario = 'rate-limited' | 'success' | 'timeout';

export interface ContractMockPlatformApiOptions {
  readonly latencyMs?: number;
  readonly scenario?: ContractMockHealthScenario;
}

function createAbortError() {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function waitForMockLatency(milliseconds: number, signal?: AbortSignal) {
  if (signal?.aborted === true) {
    return Promise.reject(createAbortError());
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(createAbortError());
      },
      { once: true },
    );
  });
}

export class ContractMockPlatformApi implements PlatformApi {
  private readonly latencyMs: number;
  private readonly scenario: ContractMockHealthScenario;

  constructor(options: ContractMockPlatformApiOptions = {}) {
    this.latencyMs = options.latencyMs ?? 250;
    this.scenario = options.scenario ?? 'success';
  }

  async createMyDataConnection(
    _consentExpiresAt: string,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(wealth.connection);
  }

  async createMyDataSync(
    _connectionId: string,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(wealth.sync);
  }

  async getAccount(accountId: string, options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    const account = wealth.accounts.find(
      (item) => item.accountId === accountId,
    );
    if (!account)
      throw new PlatformApiError({
        kind: 'http',
        message: '계좌를 찾을 수 없습니다.',
        retryable: false,
        status: 404,
      });
    return structuredClone(account);
  }

  async getAssetHistory(
    range: '1M' | '3M' | '1Y' | 'ALL' = '1Y',
    options: PlatformRequestOptions = {},
  ) {
    void range;
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(wealth.history);
  }

  async getAssetSummary(options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(wealth.summary);
  }

  async getCurrentUser(
    options: PlatformRequestOptions = {},
  ): Promise<CurrentUserResponse> {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(currentUser);
  }

  async getHealth(
    options: PlatformRequestOptions = {},
  ): Promise<PlatformHealthResponse> {
    if (this.scenario === 'timeout') {
      await waitForMockLatency(this.latencyMs, options.signal);
      throw new PlatformApiError({
        kind: 'timeout',
        message: 'Platform API 응답 시간이 초과되었습니다.',
        retryable: true,
      });
    }

    await waitForMockLatency(this.latencyMs, options.signal);
    if (this.scenario === 'rate-limited') {
      throw new PlatformApiError({
        kind: 'http',
        message: 'Platform API 요청이 너무 많습니다.',
        retryable: true,
        status: 429,
      });
    }

    return structuredClone(platformHealthFixture);
  }

  async getMyDataSync(_syncId: string, options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(wealth.sync);
  }

  async listAccounts(
    options: PlatformRequestOptions = {},
  ): Promise<Page<Account>> {
    await waitForMockLatency(this.latencyMs, options.signal);
    return { items: structuredClone(wealth.accounts), nextCursor: null };
  }

  async listHoldings(
    accountId?: string,
    options: PlatformRequestOptions = {},
  ): Promise<Page<Holding>> {
    await waitForMockLatency(this.latencyMs, options.signal);
    const items =
      accountId === undefined
        ? wealth.holdings
        : wealth.holdings.filter((item) => item.accountId === accountId);
    return { items: structuredClone(items), nextCursor: null };
  }

  async listMyDataConnections(options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return [structuredClone(wealth.connection)];
  }

  async listTransactions(
    options: PlatformRequestOptions = {},
  ): Promise<Page<Transaction>> {
    await waitForMockLatency(this.latencyMs, options.signal);
    return { items: structuredClone(wealth.transactions), nextCursor: null };
  }
}
