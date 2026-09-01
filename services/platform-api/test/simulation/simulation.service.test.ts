import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IdentityRepository } from '../../src/modules/identity/application/ports/identity-repository.port.js';
import type { SimulationRepository } from '../../src/modules/simulation/application/ports/simulation-repository.port.js';
import {
  SimulationInputError,
  SimulationNotFoundError,
  SimulationService,
} from '../../src/modules/simulation/application/simulation.service.js';
import type { AssumptionSet } from '../../src/modules/simulation/domain/simulation-model.js';

const assumption: AssumptionSet = {
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

const principal = {
  issuer: 'https://issuer.example/realms/finapp',
  subject: 'simulation-user',
  scopes: new Set(['simulation.execute']),
};

const validRequest = {
  initialAssets: '185400000.0000',
  monthlyContribution: '1500000.0000',
  durationMonths: 12,
  targetAmount: '220000000.0000',
  allocation: [
    { assetClass: 'CASH', weight: 0.1 },
    { assetClass: 'BOND', weight: 0.3 },
    { assetClass: 'EQUITY', weight: 0.6 },
  ],
};

function setup() {
  const identity = {
    provisionFromOidc: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  } as unknown as IdentityRepository;
  const repository = {
    activeAssumption: vi.fn().mockResolvedValue(assumption),
    save: vi.fn().mockImplementation(async (input) => ({
      simulationId: 'simulation-1',
      engineVersion: input.engineVersion,
      assumptionSetVersion: input.assumption.version,
      currency: 'KRW',
      goalProbability: input.result.goalProbability,
      finalValue: { p10: '1.0000', p50: '2.0000', p90: '3.0000' },
      series: [],
      disclaimer: 'synthetic',
    })),
    findByUser: vi.fn(),
  } as unknown as SimulationRepository;
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return {
    service: new SimulationService(identity, repository, audit as never),
    repository,
    audit,
  };
}

describe('simulation input and ownership policy', () => {
  afterEach(() => delete process.env.SIMULATION_PATH_COUNT);

  it.each([
    { ...validRequest, durationMonths: 0 },
    { ...validRequest, durationMonths: 601 },
    {
      ...validRequest,
      allocation: [
        { assetClass: 'CASH', weight: 0.5 },
        { assetClass: 'EQUITY', weight: 0.4 },
      ],
    },
    {
      ...validRequest,
      allocation: [{ assetClass: 'CRYPTO', weight: 1 }],
    },
  ])('rejects an invalid request', async (request) => {
    const { service } = setup();
    await expect(service.create(principal, request)).rejects.toBeInstanceOf(
      SimulationInputError,
    );
  });

  it('runs validated input server-side and passes a generated seed to persistence', async () => {
    process.env.SIMULATION_PATH_COUNT = '50';
    const { service, repository, audit } = setup();
    await service.create(principal, validRequest, 'trace-simulation');
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        pathCount: 50,
        seed: expect.any(BigInt),
        engineVersion: '1.0.0',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'SIMULATION_EXECUTED',
      resourceType: 'SIMULATION',
      resourceId: 'simulation-1',
      traceId: 'trace-simulation',
      metadata: { status: 'COMPLETED', syntheticData: true },
    });
  });

  it('returns 404 semantics for another user or unknown run', async () => {
    const { service } = setup();
    await expect(
      service.get(principal, 'simulation-unknown'),
    ).rejects.toBeInstanceOf(SimulationNotFoundError);
  });
});
