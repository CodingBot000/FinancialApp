import {
  PlatformApiError,
  type Account,
  type AssetHistoryPoint,
  type AssetSummary,
  type CreateSimulationInput,
  type CurrentUserResponse,
  type Holding,
  type MyDataConnection,
  type MyDataSync,
  type Page,
  type PlatformApi,
  type PlatformHealthResponse,
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
  listTransactions(): Promise<Page<Transaction>> {
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
