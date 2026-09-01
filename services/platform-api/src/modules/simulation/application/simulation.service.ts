import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from '../../identity/application/ports/identity-repository.port.js';
import { runSimulation } from '../domain/simulation-engine.js';
import {
  SIMULATION_ENGINE_VERSION,
  type AssetClass,
  type SimulationInputSnapshot,
  type SimulationView,
} from '../domain/simulation-model.js';
import {
  SIMULATION_REPOSITORY,
  type SimulationRepository,
} from './ports/simulation-repository.port.js';

export class SimulationInputError extends Error {}
export class SimulationNotFoundError extends Error {}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function money(
  value: unknown,
  maximum: number,
): { text: string; value: number } {
  if (
    typeof value !== 'string' ||
    !/^\d+(?:\.\d{1,4})?$/.test(value) ||
    !Number.isFinite(Number(value)) ||
    Number(value) > maximum
  ) {
    throw new SimulationInputError();
  }
  return { text: value, value: Number(value) };
}

function pathCount(): number {
  const configured = Number.parseInt(
    process.env.SIMULATION_PATH_COUNT ?? '1000',
    10,
  );
  return Number.isInteger(configured) && configured > 0 && configured <= 10_000
    ? configured
    : 1000;
}

@Injectable()
export class SimulationService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
    @Inject(SIMULATION_REPOSITORY)
    private readonly repository: SimulationRepository,
  ) {}

  async create(
    principal: AuthenticatedPrincipal,
    request: unknown,
  ): Promise<SimulationView> {
    const input = this.validate(request);
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const assumption = await this.repository.activeAssumption();
    const seed = randomBytes(8).readBigUInt64BE() & 0x7fff_ffff_ffff_ffffn;
    const paths = pathCount();
    const result = runSimulation(
      {
        initialAssets: Number(input.initialAssets),
        monthlyContribution: Number(input.monthlyContribution),
        durationMonths: input.durationMonths,
        targetAmount: Number(input.targetAmount),
        allocation: input.allocation,
      },
      assumption,
      seed,
      paths,
    );
    return this.repository.save({
      userId: user.userId,
      assumption,
      input,
      seed,
      pathCount: paths,
      engineVersion: SIMULATION_ENGINE_VERSION,
      result,
    });
  }

  async get(
    principal: AuthenticatedPrincipal,
    simulationId: string,
  ): Promise<SimulationView> {
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const result = await this.repository.findByUser(user.userId, simulationId);
    if (result === undefined) throw new SimulationNotFoundError();
    return result;
  }

  private validate(request: unknown): SimulationInputSnapshot {
    if (!isRecord(request) || !Array.isArray(request.allocation)) {
      throw new SimulationInputError();
    }
    const initialAssets = money(request.initialAssets, 1_000_000_000_000);
    const monthlyContribution = money(
      request.monthlyContribution,
      10_000_000_000,
    );
    const targetAmount = money(request.targetAmount, 999_999_999_999_999);
    if (
      !Number.isInteger(request.durationMonths) ||
      Number(request.durationMonths) < 1 ||
      Number(request.durationMonths) > 600 ||
      request.allocation.length === 0
    ) {
      throw new SimulationInputError();
    }
    const known = new Set<AssetClass>(['CASH', 'BOND', 'EQUITY']);
    const seen = new Set<AssetClass>();
    const allocation = request.allocation.map((entry) => {
      if (
        !isRecord(entry) ||
        typeof entry.assetClass !== 'string' ||
        !known.has(entry.assetClass as AssetClass) ||
        typeof entry.weight !== 'number' ||
        !Number.isFinite(entry.weight) ||
        entry.weight < 0 ||
        entry.weight > 1
      ) {
        throw new SimulationInputError();
      }
      const assetClass = entry.assetClass as AssetClass;
      if (seen.has(assetClass)) throw new SimulationInputError();
      seen.add(assetClass);
      return { assetClass, weight: entry.weight };
    });
    const totalWeight = allocation.reduce(
      (total, item) => total + item.weight,
      0,
    );
    if (Math.abs(totalWeight - 1) > 1e-8) {
      throw new SimulationInputError();
    }
    return {
      initialAssets: initialAssets.text,
      monthlyContribution: monthlyContribution.text,
      durationMonths: Number(request.durationMonths),
      targetAmount: targetAmount.text,
      allocation,
    };
  }
}
