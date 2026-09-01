export const SIMULATION_ENGINE_VERSION = '1.0.0';
export const SIMULATION_DISCLAIMER =
  'Synthetic financial simulation for technical demonstration only.';

export type AssetClass = 'CASH' | 'BOND' | 'EQUITY';

export interface SimulationAllocation {
  readonly assetClass: AssetClass;
  readonly weight: number;
}

export interface SimulationInput {
  readonly initialAssets: number;
  readonly monthlyContribution: number;
  readonly durationMonths: number;
  readonly targetAmount: number;
  readonly allocation: readonly SimulationAllocation[];
}

export interface SimulationInputSnapshot {
  readonly initialAssets: string;
  readonly monthlyContribution: string;
  readonly durationMonths: number;
  readonly targetAmount: string;
  readonly allocation: readonly SimulationAllocation[];
}

export interface AssetAssumption {
  readonly expectedAnnualReturn: number;
  readonly annualVolatility: number;
  readonly annualFee: number;
}

export interface AssumptionSet {
  readonly id: string;
  readonly version: string;
  readonly assets: Readonly<Record<AssetClass, AssetAssumption>>;
  readonly correlation: readonly (readonly number[])[];
}

export interface SimulationPoint {
  readonly month: number;
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
}

export interface SimulationEngineResult {
  readonly goalProbability: number;
  readonly points: readonly SimulationPoint[];
}

export interface SimulationView {
  readonly simulationId: string;
  readonly engineVersion: string;
  readonly assumptionSetVersion: string;
  readonly currency: 'KRW';
  readonly goalProbability: number;
  readonly finalValue: {
    readonly p10: string;
    readonly p50: string;
    readonly p90: string;
  };
  readonly series: readonly {
    readonly month: number;
    readonly p10: string;
    readonly p50: string;
    readonly p90: string;
  }[];
  readonly disclaimer: string;
}
