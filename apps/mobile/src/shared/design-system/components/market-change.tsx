import { AppText } from './app-text';
import { formatMarketRate } from '../../format/market-format';
import { formatWon } from '../../format/finance-format';

export function MarketChange({
  changePrice,
  changeRate,
}: {
  readonly changePrice: string;
  readonly changeRate: number | string;
}) {
  const numericChange = Number(changePrice);
  const tone =
    numericChange > 0
      ? 'marketUp'
      : numericChange < 0
        ? 'marketDown'
        : 'secondary';
  const direction =
    numericChange > 0 ? '상승' : numericChange < 0 ? '하락' : '보합';
  const formattedPrice = formatWon(changePrice);
  const signedPrice = numericChange > 0 ? `+${formattedPrice}` : formattedPrice;
  return (
    <AppText
      accessibilityLabel={`${direction} ${signedPrice} ${formatMarketRate(String(changeRate))}`}
      tone={tone}
      variant="bodyStrong"
    >
      {direction} {signedPrice} ({formatMarketRate(String(changeRate))})
    </AppText>
  );
}
