import type { MarketFreshness, MarketSource } from '../../../shared/api';

export { formatMarketRate } from '../../../shared/format/market-format';

export function marketNameLabel(market: 'KOSPI' | 'KOSDAQ'): string {
  return market === 'KOSPI' ? '코스피' : '코스닥';
}

export function marketSourceLabel(source: MarketSource): string {
  return source === 'KIS' ? '한국투자증권 제공' : '예시 시세';
}

export function marketFreshnessLabel(freshness: MarketFreshness): string {
  return freshness === 'FRESH' ? '최신 데이터' : '지연 데이터';
}

export function formatMarketVolume(value: string): string {
  const number = Number(value);
  return Number.isSafeInteger(number)
    ? number.toLocaleString('ko-KR')
    : '거래량 확인 필요';
}

export type MarketTrendTone = 'marketUp' | 'marketDown' | 'secondary';

export function marketTrendTone(
  current: string | number,
  previous: string | number | undefined,
  fallback: string | number | undefined,
): MarketTrendTone {
  const currentValue = Number(current);
  const comparisonValue = Number(previous ?? fallback);
  if (!Number.isFinite(currentValue) || !Number.isFinite(comparisonValue)) {
    return 'secondary';
  }
  if (currentValue > comparisonValue) return 'marketUp';
  if (currentValue < comparisonValue) return 'marketDown';
  return 'secondary';
}
