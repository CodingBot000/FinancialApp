import type { MarketBar, MarketInterval } from '../../../shared/api';

const SEOUL_TIME_ZONE = 'Asia/Seoul';

export interface MarketChartPoint {
  readonly [key: string]: number;
  readonly close: number;
  readonly high: number;
  readonly low: number;
  readonly open: number;
  readonly timestamp: number;
  readonly volume: number;
}

export interface MarketChartDomain {
  readonly max: number;
  readonly min: number;
}

export function toMarketChartPoints(
  bars: readonly MarketBar[],
): MarketChartPoint[] {
  const byTimestamp = new Map<number, MarketChartPoint>();
  for (const bar of bars) {
    const timestamp = Date.parse(bar.bucketAt);
    const open = Number(bar.open);
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    const volume = Number(bar.volume);
    if (
      ![timestamp, open, high, low, close, volume].every(Number.isFinite) ||
      high < low ||
      volume < 0
    ) {
      continue;
    }
    byTimestamp.set(timestamp, {
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return [...byTimestamp.values()].sort(
    (left, right) => left.timestamp - right.timestamp,
  );
}

export function marketChartDomain(
  points: readonly MarketChartPoint[],
): MarketChartDomain | undefined {
  if (points.length === 0) return undefined;
  let minimum = points[0]!.close;
  let maximum = minimum;
  for (let index = 1; index < points.length; index += 1) {
    const close = points[index]!.close;
    if (close < minimum) minimum = close;
    if (close > maximum) maximum = close;
  }
  const range = maximum - minimum;
  const padding = Math.max(range * 0.05, Math.abs(maximum) * 0.01, 1);
  return { min: minimum - padding, max: maximum + padding };
}

export function formatMarketChartXLabel(
  timestamp: number,
  interval: MarketInterval,
): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '-';
  if (interval === 'MINUTE') {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      timeZone: SEOUL_TIME_ZONE,
    }).format(date);
  }
  if (interval === 'MONTHLY') {
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      timeZone: SEOUL_TIME_ZONE,
      year: '2-digit',
    }).format(date);
  }
  if (interval === 'YEARLY') {
    const year = new Intl.DateTimeFormat('en-US', {
      timeZone: SEOUL_TIME_ZONE,
      year: 'numeric',
    }).format(date);
    return year;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: SEOUL_TIME_ZONE,
  }).format(date);
}

export function formatMarketChartYLabel(value: number): string {
  const absolute = Math.abs(value);
  if (!Number.isFinite(value)) return '-';
  if (absolute >= 1_000_000_000) return `${trimDecimal(value / 1_000_000_000)}B`;
  if (absolute >= 1_000_000) return `${trimDecimal(value / 1_000_000)}M`;
  if (absolute >= 1_000) return `${trimDecimal(value / 1_000)}K`;
  return Math.round(value).toLocaleString('ko-KR');
}

function trimDecimal(value: number): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}
