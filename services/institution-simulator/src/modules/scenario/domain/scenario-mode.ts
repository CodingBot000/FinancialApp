export const SCENARIO_MODES = [
  'NORMAL',
  'TIMEOUT',
  'HTTP_500',
  'MALFORMED_RESPONSE',
  'ORDER_REJECT',
  'ORDER_UNKNOWN_THEN_FILLED',
] as const;

export type ScenarioMode = (typeof SCENARIO_MODES)[number];

export function isScenarioMode(value: unknown): value is ScenarioMode {
  return SCENARIO_MODES.some((mode) => mode === value);
}
