import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { usePlatformApi } from '../../../shared/api';
import type { MarketInterval, MarketStock } from '../../../shared/api';
import { marketKeys } from '../api/market-query';

const SEARCH_DEBOUNCE_MS = 300;

export function useMarketSearch(query: string) {
  const api = usePlatformApi();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const search = useQuery({
    enabled: debouncedQuery.length > 0,
    queryFn: ({ signal }) => api.searchMarketStocks(debouncedQuery, { signal }),
    queryKey: marketKeys.search(debouncedQuery),
    retry: false,
    staleTime: 30_000,
  });

  const searchNow = () => {
    const normalizedQuery = query.trim();
    setDebouncedQuery(normalizedQuery);
    if (normalizedQuery.length > 0 && normalizedQuery === debouncedQuery) {
      void search.refetch();
    }
  };

  return { debouncedQuery, search, searchNow };
}

export function useMarketStockBySymbol(symbol: string | undefined) {
  const api = usePlatformApi();
  const normalizedSymbol = symbol?.trim() ?? '';
  return useQuery({
    enabled: normalizedSymbol.length > 0,
    queryFn: async ({ signal }) => {
      const stocks = await api.searchMarketStocks(normalizedSymbol, { signal });
      return stocks.find((stock) => stock.symbol === normalizedSymbol) ?? null;
    },
    queryKey: marketKeys.stock(normalizedSymbol || 'none'),
    retry: false,
    staleTime: 300_000,
  });
}

export function useMarketStockData(
  stock: MarketStock | undefined,
  interval: MarketInterval,
) {
  const api = usePlatformApi();
  const symbol = stock?.symbol;
  const quote = useQuery({
    enabled: symbol !== undefined,
    queryFn: ({ signal }) => api.getMarketQuote(symbol!, { signal }),
    queryKey: marketKeys.quote(symbol ?? 'none'),
    retry: false,
    staleTime: 30_000,
  });
  const bars = useQuery({
    enabled: symbol !== undefined,
    queryFn: ({ signal }) => api.getMarketBars(symbol!, interval, { signal }),
    queryKey: marketKeys.bars(symbol ?? 'none', interval),
    retry: false,
    staleTime: 300_000,
  });

  return { bars, quote };
}
