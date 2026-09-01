import type {
  AccountView,
  AssetHistoryPoint,
  AssetSummaryView,
  HoldingView,
  TransactionView,
} from '../../domain/wealth-views.js';

export const WEALTH_REPOSITORY = Symbol('WEALTH_REPOSITORY');

export interface WealthRepository {
  summary(userId: string): Promise<AssetSummaryView>;
  accounts(userId: string): Promise<readonly AccountView[]>;
  account(userId: string, accountId: string): Promise<AccountView | undefined>;
  holdings(userId: string, accountId?: string): Promise<readonly HoldingView[]>;
  transactions(userId: string): Promise<readonly TransactionView[]>;
  history(
    userId: string,
    range: '1M' | '3M' | '1Y' | 'ALL',
  ): Promise<readonly AssetHistoryPoint[]>;
}
