import { beforeEach, describe, expect, it, vi } from 'vitest';

import { platformMetrics } from '../../src/core/observability/metrics-registry.js';
import {
  CircuitBreaker,
  CircuitOpenError,
} from '../../src/core/resilience/circuit-breaker.js';

describe('CircuitBreaker', () => {
  beforeEach(() => platformMetrics.resetForTest());

  it('opens after bounded failures, rejects without a call, and recovers half-open', async () => {
    let now = 1000;
    const operation = vi.fn().mockRejectedValue(new Error('upstream down'));
    const circuit = new CircuitBreaker(
      'test-upstream',
      { failureThreshold: 2, openMilliseconds: 100 },
      () => now,
    );

    await expect(circuit.execute(operation)).rejects.toThrow('upstream down');
    await expect(circuit.execute(operation)).rejects.toThrow('upstream down');
    await expect(circuit.execute(operation)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    expect(operation).toHaveBeenCalledTimes(2);
    expect(circuit.snapshot()).toMatchObject({ state: 'OPEN' });

    now += 100;
    operation.mockResolvedValueOnce('recovered');
    await expect(circuit.execute(operation)).resolves.toBe('recovered');
    expect(circuit.snapshot()).toEqual({
      name: 'test-upstream',
      state: 'CLOSED',
      consecutiveFailures: 0,
    });
    expect(platformMetrics.snapshot()).toMatchObject({
      circuitOpenedTotal: 1,
      circuitRejectedTotal: 1,
      externalRequestFailuresTotal: 2,
    });
  });

  it('allows only one trial while half-open', async () => {
    let now = 0;
    let release: (() => void) | undefined;
    const circuit = new CircuitBreaker(
      'half-open-upstream',
      { failureThreshold: 1, openMilliseconds: 10 },
      () => now,
    );
    await expect(
      circuit.execute(() => Promise.reject(new Error('down'))),
    ).rejects.toThrow('down');
    now = 10;
    const trial = circuit.execute(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve('ok');
        }),
    );
    await expect(
      circuit.execute(() => Promise.resolve('unexpected')),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    release?.();
    await expect(trial).resolves.toBe('ok');
  });
});
