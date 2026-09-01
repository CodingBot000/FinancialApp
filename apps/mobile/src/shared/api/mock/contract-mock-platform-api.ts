import {
  PlatformApiError,
  type Account,
  type AssetHistoryPoint,
  type AssetSummary,
  type BuyOrderInput,
  type CreateOrderInput,
  type CurrentUserResponse,
  type CreateSimulationInput,
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
} from '../platform-api';
import currentUserFixture from './fixtures/current-user.success.json';
import fixture from './fixtures/platform-health.success.json';
import wealthFixture from './fixtures/wealth-dashboard.success.json';
import simulationFixture from './fixtures/simulation.success.json';
import orderFixture from './fixtures/order-flow.success.json';

const platformHealthFixture = fixture as PlatformHealthResponse;
const currentUser = currentUserFixture as CurrentUserResponse;
const simulation = simulationFixture as Simulation;
const orderFlow = orderFixture as {
  readonly order: Order;
  readonly quote: Quote;
};
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
  private developerScenario: DeveloperScenarioMode = 'NORMAL';

  constructor(options: ContractMockPlatformApiOptions = {}) {
    this.latencyMs = options.latencyMs ?? 250;
    this.scenario = options.scenario ?? 'success';
  }

  async createSimulation(
    _input: CreateSimulationInput,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(simulation);
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

  async getOrder(_orderId: string, options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(orderFlow.order);
  }

  async getSimulation(
    simulationId: string,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    if (simulationId !== simulation.simulationId)
      throw new PlatformApiError({
        kind: 'http',
        message: '시뮬레이션을 찾을 수 없습니다.',
        retryable: false,
        status: 404,
      });
    return structuredClone(simulation);
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

  async listOrders(
    cursor?: string,
    limit = 20,
    options: PlatformRequestOptions = {},
  ): Promise<OrderPage> {
    void cursor;
    void limit;
    await waitForMockLatency(this.latencyMs, options.signal);
    return { items: [structuredClone(orderFlow.order)], nextCursor: null };
  }

  async listTransactions(
    options: PlatformRequestOptions = {},
  ): Promise<Page<Transaction>> {
    await waitForMockLatency(this.latencyMs, options.signal);
    return { items: structuredClone(wealth.transactions), nextCursor: null };
  }

  async prepareBuyOrder(
    _input: CreateOrderInput,
    _idempotencyKey: string,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(orderFlow.order);
  }

  async previewBuyOrder(
    _input: BuyOrderInput,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(orderFlow.quote);
  }

  async resetDeveloperDataset(
    options: PlatformRequestOptions = {},
  ): Promise<DeveloperResetResponse> {
    await waitForMockLatency(this.latencyMs, options.signal);
    this.developerScenario = 'NORMAL';
    return {
      datasetVersion: currentUser.datasetVersion,
      scenarioMode: 'NORMAL',
      syntheticData: true,
    };
  }

  async setDeveloperScenario(
    mode: DeveloperScenarioMode,
    options: PlatformRequestOptions = {},
  ): Promise<DeveloperScenarioResponse> {
    await waitForMockLatency(this.latencyMs, options.signal);
    this.developerScenario = mode;
    return { mode: this.developerScenario, scope: 'GLOBAL' };
  }
}
