import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePlatformApi } from '../../../shared/api';
import { wealthKeys, wealthQueryOptions } from '../api/wealth-query';

const terminalSync = new Set(['COMPLETED', 'FAILED']);
const syncRefreshKeys = [
  wealthKeys.accounts,
  wealthKeys.connections,
  wealthKeys.history,
  wealthKeys.holdings,
  wealthKeys.summary,
  wealthKeys.transactions,
] as const;

export function useWealthDashboard(selectedAccountId?: string) {
  const api = usePlatformApi();
  const client = useQueryClient();
  const options = useMemo(() => wealthQueryOptions(api), [api]);
  const connections = useQuery(options.connections);
  const summary = useQuery(options.summary);
  const accounts = useQuery(options.accounts);
  const holdings = useQuery(options.holdings);
  const transactions = useQuery(options.transactions);
  const history = useQuery(options.history);
  const accountDetail = useQuery({
    enabled: selectedAccountId !== undefined,
    queryKey: ['wealth', 'account', selectedAccountId],
    queryFn: ({ signal }) => api.getAccount(selectedAccountId!, { signal }),
  });
  const [syncId, setSyncId] = useState<string>();
  const sync = useQuery({
    enabled: syncId !== undefined,
    queryKey: ['wealth', 'sync', syncId],
    queryFn: ({ signal }) => api.getMyDataSync(syncId!, { signal }),
    refetchInterval: (query) =>
      query.state.data && terminalSync.has(query.state.data.status)
        ? false
        : 400,
  });
  const createConnection = useMutation({
    mutationFn: () => {
      const expiresAt = new Date();
      expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
      return api.createMyDataConnection(expiresAt.toISOString());
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: wealthKeys.connections }),
  });
  const startSync = useMutation({
    mutationFn: (connectionId: string) => api.createMyDataSync(connectionId),
    onSuccess: (value) => setSyncId(value.syncId),
  });

  useEffect(() => {
    if (sync.data?.status !== 'COMPLETED') return;
    for (const key of syncRefreshKeys)
      void client.invalidateQueries({ exact: true, queryKey: key });
    if (selectedAccountId !== undefined)
      void client.invalidateQueries({
        exact: true,
        queryKey: ['wealth', 'account', selectedAccountId],
      });
  }, [client, selectedAccountId, sync.data?.status]);

  const queries = {
    accounts,
    connections,
    history,
    holdings,
    summary,
    transactions,
  };
  const pending = Object.values(queries).some((query) => query.isPending);
  const hasData = Object.values(queries).some(
    (query) => query.data !== undefined,
  );
  const refreshing = Object.values(queries).some(
    (query) => query.isFetching && !query.isPending,
  );
  const error = Object.values(queries).find((query) => query.isError)?.error;
  const retry = () =>
    Object.values(queries).forEach((query) => void query.refetch());

  return {
    createConnection,
    data: {
      accounts: accounts.data?.items ?? [],
      account: accountDetail.data,
      connections: connections.data ?? [],
      history: history.data ?? [],
      holdings: holdings.data?.items ?? [],
      summary: summary.data,
      transactions: transactions.data?.items ?? [],
    },
    error,
    accountError: accountDetail.error,
    accountPending: selectedAccountId !== undefined && accountDetail.isPending,
    hasData,
    pending: pending && !hasData,
    refreshing,
    retry,
    retryAccount: () => void accountDetail.refetch(),
    startSync,
    sync: sync.data,
    syncError: createConnection.error ?? startSync.error ?? sync.error,
  };
}
