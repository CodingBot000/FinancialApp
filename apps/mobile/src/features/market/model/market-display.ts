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
