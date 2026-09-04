import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  usePlatformApi,
  type BuyOrderInput,
  type CreateOrderInput,
  type Quote,
} from '../../../shared/api';
import type { BiometricGate } from '../../../shared/auth/biometric-gate';
import {
  fundOrderQuantityFromAmount,
  fundReferenceUnitPrice,
  validateFundPurchaseAmount,
} from '../model/fund-order';

const finalStatuses = new Set(['FAILED', 'FILLED', 'REJECTED']);

function actionId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
}

export function useOrderFlow(purchaseAmount: string) {
  const api = usePlatformApi();
  const client = useQueryClient();
  const accounts = useQuery({
    queryKey: ['wealth', 'accounts'],
    queryFn: ({ signal }) => api.listAccounts({ signal }),
  });
  const holdings = useQuery({
    queryKey: ['wealth', 'holdings'],
    queryFn: ({ signal }) => api.listHoldings(undefined, { signal }),
  });
  const history = useQuery({
    queryKey: ['orders', 'list'],
    queryFn: ({ signal }) => api.listOrders(undefined, 20, { signal }),
  });
  const [quote, setQuote] = useState<Quote>();
  const [orderId, setOrderId] = useState<string>();
  const [localError, setLocalError] = useState<string>();
  const idempotencyKey = useRef<string | undefined>(undefined);
  const selection = {
    account: accounts.data?.items[0],
    holding: holdings.data?.items[0],
  };
  const referenceUnitPrice = selection.holding
    ? fundReferenceUnitPrice(
        selection.holding.marketValue,
        selection.holding.quantity,
      )
    : undefined;
  const quantity = referenceUnitPrice
    ? fundOrderQuantityFromAmount(purchaseAmount, referenceUnitPrice)
    : undefined;
  const input: BuyOrderInput | undefined =
    selection.account && selection.holding && quantity
      ? {
          accountId: selection.account.accountId,
          instrumentId: selection.holding.instrumentId,
          quantity,
          side: 'BUY',
        }
      : undefined;

  const preview = useMutation({
    mutationFn: (value: BuyOrderInput) => api.previewBuyOrder(value),
    onSuccess: (value) => {
      idempotencyKey.current = actionId();
      setLocalError(undefined);
      setOrderId(undefined);
      setQuote(value);
    },
    retry: false,
  });
  const submit = useMutation({
    mutationFn: (value: CreateOrderInput) =>
      api.prepareBuyOrder(value, idempotencyKey.current!),
    onSuccess: (value) => {
      setOrderId(value.orderId);
      void client.invalidateQueries({
        exact: true,
        queryKey: ['orders', 'list'],
      });
    },
    retry: false,
  });
  const status = useQuery({
    enabled: orderId !== undefined,
    queryKey: ['orders', 'detail', orderId],
    queryFn: ({ signal }) => api.getOrder(orderId!, { signal }),
    refetchInterval: (query) =>
      query.state.data && finalStatuses.has(query.state.data.status)
        ? false
        : (query.state.data?.statusRefreshRecommendedAfterMs ?? 2000),
  });
  const currentQuote =
    quote && input && quote.quantity === input.quantity ? quote : undefined;

  useEffect(() => {
    if (status.data?.status !== 'FILLED') return;
    for (const key of [
      ['wealth', 'summary'],
      ['wealth', 'accounts'],
      ['wealth', 'holdings'],
      ['wealth', 'history'],
      ['orders', 'list'],
    ] as const)
      void client.invalidateQueries({ exact: true, queryKey: key });
  }, [client, status.data?.status]);

  const confirm = async (gate: BiometricGate) => {
    if (!currentQuote || !input || !idempotencyKey.current) return;
    if (Date.parse(currentQuote.expiresAt) <= Date.now()) {
      setLocalError('QUOTE_EXPIRED');
      return;
    }
    const authentication = await gate.authenticate();
    if (authentication.status !== 'authenticated') {
      setLocalError('BIOMETRIC_REQUIRED');
      return;
    }
    submit.mutate({ ...input, quoteId: currentQuote.quoteId });
  };

  return {
    confirm,
    error: localError ?? preview.error ?? submit.error ?? status.error,
    history: history.data?.items ?? [],
    input,
    pending: accounts.isPending || holdings.isPending || history.isPending,
    preview,
    quote: currentQuote,
    runPreview: () => {
      if (!input || validateFundPurchaseAmount(purchaseAmount)) {
        setLocalError('VALIDATION_FAILED');
        return;
      }
      preview.mutate(input);
    },
    selection,
    status: status.data ?? submit.data,
  };
}
