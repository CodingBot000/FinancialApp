import type {
  MarketBar,
  MarketFreshness,
  MarketSource,
} from '../../../shared/api';

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
  return source === 'KIS' ? '한국투자증권' : '로컬 테스트 데이터';
}

export function marketFreshnessLabel(freshness: MarketFreshness): string {
  return freshness === 'FRESH' ? '최신 데이터' : '지연 데이터';
}

export function formatMarketRate(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '등락률 확인 필요';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toLocaleString('ko-KR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}

export function formatMarketVolume(value: string): string {
  const number = Number(value);
  return Number.isSafeInteger(number)
    ? number.toLocaleString('ko-KR')
    : '거래량 확인 필요';
}
