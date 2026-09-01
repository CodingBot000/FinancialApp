import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappAssumptionSet,
  finappSimulationResultPoint,
  finappSimulationResultSummary,
  finappSimulationRun,
} from '../../../../database/schema.js';
import type {
  SaveSimulationInput,
  SimulationRepository,
} from '../../application/ports/simulation-repository.port.js';
import {
  SIMULATION_DISCLAIMER,
  type AssetAssumption,
  type AssetClass,
  type AssumptionSet,
  type SimulationView,
} from '../../domain/simulation-model.js';

const schema = {
  finappAssumptionSet,
  finappSimulationResultPoint,
  finappSimulationResultSummary,
  finappSimulationRun,
};

type Database = NodePgDatabase<typeof schema>;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assumption(value: unknown): AssetAssumption {
  if (!isRecord(value)) throw new Error('Asset assumption is invalid.');
  const expectedAnnualReturn = value.expectedAnnualReturn;
  const annualVolatility = value.annualVolatility;
  const annualFee = value.annualFee;
  if (
    typeof expectedAnnualReturn !== 'number' ||
    typeof annualVolatility !== 'number' ||
    typeof annualFee !== 'number' ||
    ![expectedAnnualReturn, annualVolatility, annualFee].every(
      Number.isFinite,
    ) ||
    annualVolatility < 0 ||
    annualFee < 0
  ) {
    throw new Error('Asset assumption values are invalid.');
  }
  return { expectedAnnualReturn, annualVolatility, annualFee };
}

function parseAssumption(row: {
  readonly id: string;
  readonly versionName: string;
  readonly assetAssumptions: unknown;
  readonly correlationMatrix: unknown;
}): AssumptionSet {
  const rawAssets = row.assetAssumptions;
  if (!isRecord(rawAssets) || !Array.isArray(row.correlationMatrix)) {
    throw new Error('Simulation assumption set is invalid.');
  }
  const classes = ['CASH', 'BOND', 'EQUITY'] as const;
  const assets = Object.fromEntries(
    classes.map((assetClass) => [
      assetClass,
      assumption(rawAssets[assetClass]),
    ]),
  ) as Record<AssetClass, AssetAssumption>;
  const correlation = row.correlationMatrix.map((matrixRow) => {
    if (
      !Array.isArray(matrixRow) ||
      matrixRow.some(
        (entry) => typeof entry !== 'number' || !Number.isFinite(entry),
      )
    ) {
      throw new Error('Simulation correlation matrix is invalid.');
    }
    return matrixRow as number[];
  });
  return { id: row.id, version: row.versionName, assets, correlation };
}

function money(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Simulation result is outside the numeric range.');
  }
  return value.toFixed(4);
}

@Injectable()
export class DrizzleSimulationRepository implements SimulationRepository {
  private readonly database: Database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool, { schema });
  }

  async activeAssumption(): Promise<AssumptionSet> {
    const rows = await this.database
      .select({
        id: finappAssumptionSet.id,
        versionName: finappAssumptionSet.versionName,
        assetAssumptions: finappAssumptionSet.assetAssumptions,
        correlationMatrix: finappAssumptionSet.correlationMatrix,
      })
      .from(finappAssumptionSet)
      .where(eq(finappAssumptionSet.status, 'ACTIVE'))
      .orderBy(desc(finappAssumptionSet.effectiveFrom))
      .limit(1);
    const row = rows[0];
    if (row === undefined) throw new Error('Active assumption set is missing.');
    return parseAssumption(row);
  }

  async save(input: SaveSimulationInput): Promise<SimulationView> {
    const simulationId = randomUUID();
    const now = new Date();
    const final = input.result.points.at(-1);
    if (final === undefined)
      throw new Error('Simulation result has no points.');

    await this.database.transaction(async (transaction) => {
      await transaction.insert(finappSimulationRun).values({
        id: simulationId,
        userId: input.userId,
        assumptionSetId: input.assumption.id,
        engineVersion: input.engineVersion,
        inputSnapshot: input.input,
        seed: input.seed,
        pathCount: input.pathCount,
        durationMonths: input.input.durationMonths,
        status: 'COMPLETED',
        createdAt: now,
        completedAt: now,
      });
      await transaction.insert(finappSimulationResultSummary).values({
        simulationRunId: simulationId,
        goalProbability: input.result.goalProbability.toFixed(8),
        finalP10: money(final.p10),
        finalP50: money(final.p50),
        finalP90: money(final.p90),
        currency: 'KRW',
      });
      await transaction.insert(finappSimulationResultPoint).values(
        input.result.points.map((point) => ({
          simulationRunId: simulationId,
          month: point.month,
          p10: money(point.p10),
          p50: money(point.p50),
          p90: money(point.p90),
        })),
      );
    });
    const view = await this.findByUser(input.userId, simulationId);
    if (view === undefined) throw new Error('Saved simulation was not found.');
    return view;
  }

  async findByUser(
    userId: string,
    simulationId: string,
  ): Promise<SimulationView | undefined> {
    const summaries = await this.database
      .select({
        simulationId: finappSimulationRun.id,
        engineVersion: finappSimulationRun.engineVersion,
        assumptionSetVersion: finappAssumptionSet.versionName,
        goalProbability: finappSimulationResultSummary.goalProbability,
        finalP10: finappSimulationResultSummary.finalP10,
        finalP50: finappSimulationResultSummary.finalP50,
        finalP90: finappSimulationResultSummary.finalP90,
        currency: finappSimulationResultSummary.currency,
      })
      .from(finappSimulationRun)
      .innerJoin(
        finappAssumptionSet,
        eq(finappSimulationRun.assumptionSetId, finappAssumptionSet.id),
      )
      .innerJoin(
        finappSimulationResultSummary,
        eq(
          finappSimulationRun.id,
          finappSimulationResultSummary.simulationRunId,
        ),
      )
      .where(
        and(
          eq(finappSimulationRun.id, simulationId),
          eq(finappSimulationRun.userId, userId),
          eq(finappSimulationRun.status, 'COMPLETED'),
        ),
      )
      .limit(1);
    const summary = summaries[0];
    if (summary === undefined) return undefined;
    const points = await this.database
      .select({
        month: finappSimulationResultPoint.month,
        p10: finappSimulationResultPoint.p10,
        p50: finappSimulationResultPoint.p50,
        p90: finappSimulationResultPoint.p90,
      })
      .from(finappSimulationResultPoint)
      .where(eq(finappSimulationResultPoint.simulationRunId, simulationId))
      .orderBy(asc(finappSimulationResultPoint.month));

    return {
      simulationId: summary.simulationId,
      engineVersion: summary.engineVersion,
      assumptionSetVersion: summary.assumptionSetVersion,
      currency: summary.currency as 'KRW',
      goalProbability: Number(summary.goalProbability),
      finalValue: {
        p10: summary.finalP10,
        p50: summary.finalP50,
        p90: summary.finalP90,
      },
      series: points,
      disclaimer: SIMULATION_DISCLAIMER,
    };
  }
}
