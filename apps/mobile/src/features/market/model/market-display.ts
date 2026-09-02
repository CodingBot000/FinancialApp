import type {
  MarketBar,
  MarketFreshness,
  MarketSource,
} from '../../../shared/api';

export { formatMarketRate } from '../../../shared/format/market-format';

export interface MarketChartPoint {
  readonly [key: string]: number;
  readonly close: number;
  readonly index: number;
}

export function toMarketChartPoints(
  bars: readonly MarketBar[],
): MarketChartPoint[] {
  return bars.reduce<MarketChartPoint[]>((points, bar, index) => {
    const close = Number(bar.close);
    if (Number.isFinite(close)) points.push({ index, close });
    return points;
  }, []);
}

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
