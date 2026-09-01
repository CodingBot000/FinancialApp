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
  type Quote,
  type Simulation,
  type Transaction,
} from './platform-api';

export class UnavailablePlatformApi implements PlatformApi {
  constructor(private readonly reason: string) {}

  createSimulation(input: CreateSimulationInput): Promise<Simulation> {
    void input;
    return this.reject();
  }

  createMyDataConnection(): Promise<MyDataConnection> {
    return this.reject();
  }
  createMyDataSync(): Promise<MyDataSync> {
    return this.reject();
  }
  getAccount(): Promise<Account> {
    return this.reject();
  }
  getAssetHistory(): Promise<readonly AssetHistoryPoint[]> {
    return this.reject();
  }
  getAssetSummary(): Promise<AssetSummary> {
    return this.reject();
  }

  getCurrentUser(): Promise<CurrentUserResponse> {
    return this.reject();
  }

  getHealth(): Promise<PlatformHealthResponse> {
    return this.reject();
  }

  getMyDataSync(): Promise<MyDataSync> {
    return this.reject();
  }
  getOrder(): Promise<Order> {
    return this.reject();
  }
  getSimulation(): Promise<Simulation> {
    return this.reject();
  }
  listAccounts(): Promise<Page<Account>> {
    return this.reject();
  }
  listHoldings(): Promise<Page<Holding>> {
    return this.reject();
  }
  listMyDataConnections(): Promise<readonly MyDataConnection[]> {
    return this.reject();
  }
  listOrders(): Promise<OrderPage> {
    return this.reject();
  }
  listTransactions(): Promise<Page<Transaction>> {
    return this.reject();
  }
  prepareBuyOrder(
    input: CreateOrderInput,
    idempotencyKey: string,
  ): Promise<Order> {
    void input;
    void idempotencyKey;
    return this.reject();
  }
  previewBuyOrder(input: BuyOrderInput): Promise<Quote> {
    void input;
    return this.reject();
  }
  resetDeveloperDataset(): Promise<DeveloperResetResponse> {
    return this.reject();
  }
  setDeveloperScenario(
    mode: DeveloperScenarioMode,
  ): Promise<DeveloperScenarioResponse> {
    void mode;
    return this.reject();
  }

  private reject<T>(): Promise<T> {
    return Promise.reject(
      new PlatformApiError({
        kind: 'configuration',
        message: this.reason,
        retryable: false,
      }),
    );
  }
}
