export interface AssetSummaryView {
  readonly asOfDate: string;
  readonly currency: string;
  readonly totalAssets: string;
  readonly cash: string;
  readonly investments: string;
  readonly change: { readonly amount: string; readonly rate: number };
  readonly allocation: readonly {
    readonly assetClass: string;
    readonly amount: string;
    readonly weight: number;
  }[];
  readonly lastSyncedAt: string | null;
}

export interface AccountView {
  readonly accountId: string;
  readonly institutionCode: string;
  readonly maskedAccountNumber: string;
  readonly accountType: string;
  readonly currency: string;
  readonly status: string;
  readonly cashBalance: string;
}

export interface HoldingView {
  readonly holdingId: string;
  readonly accountId: string;
  readonly instrumentCode: string;
  readonly displayName: string;
  readonly assetClass: string;
  readonly quantity: string;
  readonly averagePrice: string;
  readonly marketValue: string;
  readonly asOfAt: string;
}

export interface TransactionView {
  readonly transactionId: string;
  readonly accountId: string;
  readonly transactionType: string;
  readonly amount: string;
  readonly currency: string;
  readonly occurredAt: string;
}

export interface AssetHistoryPoint {
  readonly date: string;
  readonly totalAssets: string;
  readonly cash: string;
  readonly investments: string;
}
