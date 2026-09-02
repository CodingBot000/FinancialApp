import { useLocalSearchParams, useRouter } from 'expo-router';

import { MarketDetailScreen } from '../../features/market';

export default function MarketDetailRoute() {
  const router = useRouter();
  const { symbol } = useLocalSearchParams<{ symbol?: string | string[] }>();
  const resolvedSymbol = Array.isArray(symbol) ? symbol[0] : symbol;

  return (
    <MarketDetailScreen onBack={() => router.back()} symbol={resolvedSymbol} />
  );
}
