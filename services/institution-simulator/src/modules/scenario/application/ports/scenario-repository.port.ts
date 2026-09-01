import type { ScenarioMode } from '../../domain/scenario-mode.js';

export const SCENARIO_REPOSITORY = Symbol('SCENARIO_REPOSITORY');

export interface ScenarioRepository {
  current(): Promise<ScenarioMode>;
  reset(): Promise<void>;
  seed(): Promise<void>;
  set(mode: ScenarioMode): Promise<void>;
}
