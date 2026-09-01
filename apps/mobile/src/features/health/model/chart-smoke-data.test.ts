import { describe, expect, it } from 'vitest';

import { chartSmokeData } from './chart-smoke-data';

describe('chartSmokeData', () => {
  it('is deterministic, finite, and ordered for the compatibility spike', () => {
    expect(chartSmokeData).toHaveLength(6);
    expect(chartSmokeData.map((point) => point.month)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(chartSmokeData.every((point) => Number.isFinite(point.assets))).toBe(
      true,
    );
  });
});
