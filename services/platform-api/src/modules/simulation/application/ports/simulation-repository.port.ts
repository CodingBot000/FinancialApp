import type {
  AssumptionSet,
  SimulationEngineResult,
  SimulationInputSnapshot,
  SimulationView,
} from '../../domain/simulation-model.js';

export const SIMULATION_REPOSITORY = Symbol('SIMULATION_REPOSITORY');

export interface SaveSimulationInput {
  readonly userId: string;
  readonly assumption: AssumptionSet;
  readonly input: SimulationInputSnapshot;
  readonly seed: bigint;
  readonly pathCount: number;
  readonly engineVersion: string;
  readonly result: SimulationEngineResult;
}

export interface SimulationRepository {
  activeAssumption(): Promise<AssumptionSet>;
  save(input: SaveSimulationInput): Promise<SimulationView>;
  findByUser(
    userId: string,
    simulationId: string,
  ): Promise<SimulationView | undefined>;
}
