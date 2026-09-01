import { describe, expect, it } from 'vitest';

import { runSimulation } from '../../src/modules/simulation/domain/simulation-engine.js';
import type {
  AssumptionSet,
  SimulationInput,
} from '../../src/modules/simulation/domain/simulation-model.js';

const assumptions: AssumptionSet = {
  id: '60000000-0000-4000-8000-000000000001',
  version: 'SYNTHETIC_V1',
  assets: {
    CASH: {
      expectedAnnualReturn: 0.025,
      annualVolatility: 0.005,
      annualFee: 0.001,
    },
    BOND: {
      expectedAnnualReturn: 0.04,
      annualVolatility: 0.08,
      annualFee: 0.002,
    },
    EQUITY: {
      expectedAnnualReturn: 0.07,
      annualVolatility: 0.18,
      annualFee: 0.004,
    },
  },
  correlation: [
    [1, 0.15, 0.05],
    [0.15, 1, 0.25],
    [0.05, 0.25, 1],
  ],
};

const input: SimulationInput = {
  initialAssets: 185_400_000,
  monthlyContribution: 1_500_000,
  durationMonths: 120,
  targetAmount: 450_000_000,
  allocation: [
    { assetClass: 'CASH', weight: 0.1 },
    { assetClass: 'BOND', weight: 0.3 },
    { assetClass: 'EQUITY', weight: 0.6 },
  ],
};

describe('deterministic synthetic simulation engine', () => {
  it('returns exactly the same result for the same versions, input, and seed', () => {
    const first = runSimulation(input, assumptions, 20260902n, 300);
    const second = runSimulation(input, assumptions, 20260902n, 300);
    expect(second).toEqual(first);
  });

  it('maintains p10 <= p50 <= p90 at every month', () => {
    const result = runSimulation(input, assumptions, 100n, 300);
    expect(result.points).toHaveLength(121);
    for (const point of result.points) {
      expect(point.p10).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p90);
      expect(Number.isFinite(point.p90)).toBe(true);
    }
  });

  it('does not reduce final p50 when monthly contribution increases', () => {
    const base = runSimulation(input, assumptions, 200n, 300);
    const increased = runSimulation(
      { ...input, monthlyContribution: input.monthlyContribution + 1_000_000 },
      assumptions,
      200n,
      300,
    );
    expect(increased.points.at(-1)?.p50).toBeGreaterThanOrEqual(
      base.points.at(-1)?.p50 ?? 0,
    );
  });

  it('does not increase goal probability when target amount increases', () => {
    const base = runSimulation(input, assumptions, 300n, 300);
    const increasedTarget = runSimulation(
      { ...input, targetAmount: input.targetAmount + 100_000_000 },
      assumptions,
      300n,
      300,
    );
    expect(increasedTarget.goalProbability).toBeLessThanOrEqual(
      base.goalProbability,
    );
  });

  it('completes the default 1,000 path and 120 month workload in budget', () => {
    const started = performance.now();
    runSimulation(input, assumptions, 400n, 1000);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
