import { queryOptions } from '@tanstack/react-query';

import type { PlatformApi } from '../../../shared/api';

export const wealthKeys = {
  accounts: ['wealth', 'accounts'] as const,
  connections: ['wealth', 'connections'] as const,
  history: ['wealth', 'history'] as const,
  holdings: ['wealth', 'holdings'] as const,
  summary: ['wealth', 'summary'] as const,
  transactions: ['wealth', 'transactions'] as const,
};

export function wealthQueryOptions(api: PlatformApi) {
  return {
    accounts: queryOptions({
      queryKey: wealthKeys.accounts,
      queryFn: ({ signal }) => api.listAccounts({ signal }),
    }),
    connections: queryOptions({
      queryKey: wealthKeys.connections,
      queryFn: ({ signal }) => api.listMyDataConnections({ signal }),
    }),
    history: queryOptions({
      queryKey: wealthKeys.history,
      queryFn: ({ signal }) => api.getAssetHistory('1Y', { signal }),
    }),
    holdings: queryOptions({
      queryKey: wealthKeys.holdings,
      queryFn: ({ signal }) => api.listHoldings(undefined, { signal }),
    }),
    summary: queryOptions({
      queryKey: wealthKeys.summary,
      queryFn: ({ signal }) => api.getAssetSummary({ signal }),
    }),
    transactions: queryOptions({
      queryKey: wealthKeys.transactions,
      queryFn: ({ signal }) => api.listTransactions({ signal }),
    }),
  };
}
