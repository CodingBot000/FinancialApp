import { describe, expect, it } from 'vitest';

import {
  formatMarketChartXLabel,
  formatMarketChartYLabel,
  marketChartDomain,
  toMarketChartPoints,
} from './market-chart-model';

describe('market display model', () => {
  it('converts canonical money strings to chart points and skips invalid values', () => {
    expect(
      toMarketChartPoints([
        {
          bucketAt: '2026-09-01T00:00:00.000Z',
          open: '73000.0000',
          high: '74000.0000',
          low: '72000.0000',
          close: '73500.0000',
          volume: '1000',
        },
        {
          bucketAt: '2026-09-02T00:00:00.000Z',
          open: '0.0000',
          high: '0.0000',
          low: '0.0000',
          close: 'not-a-number',
          volume: '1000',
        },
      ]),
    ).toEqual([
      {
        timestamp: Date.parse('2026-09-01T00:00:00.000Z'),
        open: 73000,
        high: 74000,
        low: 72000,
        close: 73500,
        volume: 1000,
      },
    ]);
  });

  it('sorts timestamps, deduplicates them, and calculates a padded domain', () => {
    const points = toMarketChartPoints([
      {
        bucketAt: '2026-09-02T00:00:00.000Z',
        open: '74000.0000',
        high: '75000.0000',
        low: '73000.0000',
        close: '74500.0000',
        volume: '2000',
      },
      {
        bucketAt: '2026-09-01T00:00:00.000Z',
        open: '73000.0000',
        high: '74000.0000',
        low: '72000.0000',
        close: '73500.0000',
        volume: '1000',
      },
    ]);
    expect(points.map((point) => point.close)).toEqual([73500, 74500]);
    expect(marketChartDomain(points)).toEqual({ min: 72755, max: 75245 });
  });

  it('formats interval timestamps and compact prices for chart axes', () => {
    const timestamp = Date.parse('2026-09-02T06:30:00.000Z');
    expect(formatMarketChartXLabel(timestamp, 'MINUTE')).toBe('15:30');
    expect(formatMarketChartXLabel(timestamp, 'DAILY')).toMatch(/09.*02/);
    expect(formatMarketChartXLabel(timestamp, 'YEARLY')).toBe('2026년');
    expect(formatMarketChartYLabel(74_200)).toBe('7.4만');
    expect(formatMarketChartYLabel(125_000_000)).toBe('1.3억');
  });
});
