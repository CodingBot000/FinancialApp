export const SIMULATOR_ADMIN_PORT = Symbol('SIMULATOR_ADMIN_PORT');

export type ScenarioMode =
  | 'NORMAL'
  | 'TIMEOUT'
  | 'HTTP_500'
  | 'MALFORMED_RESPONSE'
  | 'ORDER_REJECT'
  | 'ORDER_UNKNOWN_THEN_FILLED';

export interface SimulatorAdminPort {
  setScenario(
    mode: ScenarioMode,
  ): Promise<{ readonly mode: ScenarioMode; readonly scope: 'GLOBAL' }>;
  reset(): Promise<{
    readonly datasetVersion: string;
    readonly scenarioMode: 'NORMAL';
    readonly syntheticData: true;
  }>;
}
