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
  type UpdateRiskProfileInput,
  type UserRiskProfile,
  type MarketBars,
  type MarketQuote,
  type MarketStock,
  type MarketInterval,
} from '../platform-api';
import currentUserFixture from './fixtures/current-user.success.json';
import fixture from './fixtures/platform-health.success.json';
import wealthFixture from './fixtures/wealth-dashboard.success.json';
import simulationFixture from './fixtures/simulation.success.json';
import orderFixture from './fixtures/order-flow.success.json';
import marketFixture from './fixtures/market-data.success.json';

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
const marketStocks = marketFixture.stocks as readonly MarketStock[];
const marketQuote = marketFixture.quote as MarketQuote;
const marketBars = marketFixture.bars as MarketBars;

function scaledDecimal(value: string, scale: number): bigint | undefined {
  const match = /^(?:0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(value);
  if (!match) return undefined;
  const fraction = match[1] ?? '';
  if (fraction.length > scale) return undefined;
  const whole = value.split('.')[0] ?? '0';
  return (
    BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, '0') || '0')
  );
}

function fixedDecimal(value: bigint, scale: number): string {
  const divisor = 10n ** BigInt(scale);
  return `${value / divisor}.${(value % divisor)
    .toString()
    .padStart(scale, '0')}`;
}

function normalizedOrderValues(quantity: string, unitPrice: string) {
  const scaledQuantity = scaledDecimal(quantity, 8);
  const scaledPrice = scaledDecimal(unitPrice, 4);
  if (
    scaledQuantity === undefined ||
    scaledQuantity <= 0n ||
    scaledPrice === undefined ||
    scaledPrice <= 0n
  ) {
    throw new Error('Contract mock received invalid order decimal values.');
  }
  return {
    estimatedAmount: fixedDecimal(
      (scaledQuantity * scaledPrice) / 100_000_000n,
      4,
    ),
    quantity: fixedDecimal(scaledQuantity, 8),
  };
}

function marketBarsForInterval(interval: MarketInterval): MarketBars {
  const anchor = new Date('2026-09-02T00:00:00.000Z');
  const bars = marketBars.bars.map((bar, index, values) => {
    const date = new Date(anchor);
    const offset = values.length - 1 - index;
    if (interval === 'MINUTE')
      date.setUTCMinutes(date.getUTCMinutes() - offset);
    else if (interval === 'DAILY') date.setUTCDate(date.getUTCDate() - offset);
    else if (interval === 'WEEKLY')
      date.setUTCDate(date.getUTCDate() - offset * 7);
    else if (interval === 'MONTHLY')
      date.setUTCMonth(date.getUTCMonth() - offset);
    else date.setUTCFullYear(date.getUTCFullYear() - offset);
    return { ...bar, bucketAt: date.toISOString() };
  });
  return { ...marketBars, interval, bars };
}

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
  private latestOrder: Order | undefined;
  private riskProfile: UserRiskProfile = {
    riskLevel: 'BALANCED',
    investmentHorizonMonths: 120,
    monthlyContribution: '1500000.0000',
    version: '0',
    updatedAt: '2026-09-02T00:00:00.000Z',
  };

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
    return {
      ...structuredClone(currentUser),
      riskProfile: this.riskProfile.riskLevel,
    };
  }

  async getRiskProfile(options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(this.riskProfile);
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

  async searchMarketStocks(
    query: string,
    options: PlatformRequestOptions = {},
  ): Promise<readonly MarketStock[]> {
    await waitForMockLatency(this.latencyMs, options.signal);
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    return structuredClone(
      marketStocks.filter(
        (stock) =>
          stock.symbol.startsWith(normalized) ||
          stock.name.toLocaleLowerCase('ko-KR').includes(normalized),
      ),
    );
  }

  async getMarketQuote(
    symbol: string,
    options: PlatformRequestOptions = {},
  ): Promise<MarketQuote> {
    await waitForMockLatency(this.latencyMs, options.signal);
    if (symbol !== marketQuote.symbol) {
      throw new PlatformApiError({
        kind: 'http',
        message: '조회할 종목을 찾을 수 없습니다.',
        retryable: false,
        status: 404,
      });
    }
    return structuredClone(marketQuote);
  }

  async getMarketBars(
    symbol: string,
    interval: MarketInterval,
    options: PlatformRequestOptions = {},
  ): Promise<MarketBars> {
    await waitForMockLatency(this.latencyMs, options.signal);
    if (symbol !== marketBars.symbol) {
      throw new PlatformApiError({
        kind: 'http',
        message: '조회할 차트 데이터를 찾을 수 없습니다.',
        retryable: false,
        status: 404,
      });
    }
    return structuredClone(marketBarsForInterval(interval));
  }

  async getMyDataSync(_syncId: string, options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(wealth.sync);
  }

  async getOrder(_orderId: string, options: PlatformRequestOptions = {}) {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(this.latestOrder ?? orderFlow.order);
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
    return {
      items: [structuredClone(this.latestOrder ?? orderFlow.order)],
      nextCursor: null,
    };
  }

  async listTransactions(
    options: PlatformRequestOptions = {},
  ): Promise<Page<Transaction>> {
    await waitForMockLatency(this.latencyMs, options.signal);
    return { items: structuredClone(wealth.transactions), nextCursor: null };
  }

  async prepareBuyOrder(
    input: CreateOrderInput,
    _idempotencyKey: string,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    const values = normalizedOrderValues(
      input.quantity,
      orderFlow.quote.unitPrice,
    );
    this.latestOrder = {
      ...orderFlow.order,
      estimatedAmount: values.estimatedAmount,
      filledAmount: values.estimatedAmount,
      quantity: values.quantity,
    };
    return structuredClone(this.latestOrder);
  }

  async previewBuyOrder(
    input: BuyOrderInput,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    const values = normalizedOrderValues(
      input.quantity,
      orderFlow.quote.unitPrice,
    );
    return {
      ...structuredClone(orderFlow.quote),
      estimatedAmount: values.estimatedAmount,
      quantity: values.quantity,
    };
  }

  async resetDeveloperDataset(
    options: PlatformRequestOptions = {},
  ): Promise<DeveloperResetResponse> {
    await waitForMockLatency(this.latencyMs, options.signal);
    this.developerScenario = 'NORMAL';
    this.latestOrder = undefined;
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

  async updateRiskProfile(
    input: UpdateRiskProfileInput,
    options: PlatformRequestOptions = {},
  ) {
    await waitForMockLatency(this.latencyMs, options.signal);
    if (input.expectedVersion !== this.riskProfile.version) {
      throw new PlatformApiError({
        code: 'VERSION_CONFLICT',
        kind: 'http',
        message: '투자 성향 정보가 먼저 변경되었습니다.',
        retryable: false,
        status: 409,
      });
    }
    this.riskProfile = {
      riskLevel: input.riskLevel,
      investmentHorizonMonths: input.investmentHorizonMonths,
      monthlyContribution: input.monthlyContribution,
      version: String(Number(this.riskProfile.version) + 1),
      updatedAt: '2026-09-02T00:01:00.000Z',
    };
    return structuredClone(this.riskProfile);
  }
}
