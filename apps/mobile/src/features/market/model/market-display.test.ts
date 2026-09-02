import { describe, expect, it } from 'vitest';

import { toMarketChartPoints } from './market-display';

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
    ).toEqual([{ index: 0, close: 73500 }]);
  });
});
