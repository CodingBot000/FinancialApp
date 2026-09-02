import { useRouter } from 'expo-router';

import { MarketScreen } from '../../features/market';
import type { MarketStock } from '../../shared/api';

export default function MarketRoute() {
  const router = useRouter();
  const openDetails = (stock: MarketStock) => {
    router.push({
      params: { symbol: stock.symbol },
      pathname: '/market/[symbol]',
    } as never);
  };

  return <MarketScreen onOpenDetails={openDetails} />;
}
