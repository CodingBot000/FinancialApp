import type { MarketInterval } from '../../../shared/api';

export const marketKeys = {
  all: ['market'] as const,
  search: (query: string) => ['market', 'stocks', query] as const,
  stock: (symbol: string) => ['market', 'stock', symbol] as const,
  quote: (symbol: string) => ['market', 'quote', symbol] as const,
  bars: (symbol: string, interval: MarketInterval) =>
    ['market', 'bars', symbol, interval] as const,
};
