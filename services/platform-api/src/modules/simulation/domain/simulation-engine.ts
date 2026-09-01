import type {
  AssumptionSet,
  SimulationEngineResult,
  SimulationInput,
} from './simulation-model.js';

class SeededRandom {
  private readonly state: [number, number, number, number];
  private spare: number | undefined;

  constructor(seed: bigint) {
    let value =
      Number(seed & 0xffff_ffffn) ^ Number((seed >> 32n) & 0xffff_ffffn);
    const nextState = () => {
      value = (value + 0x9e37_79b9) | 0;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0_aaad);
      mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a_2d97);
      return (mixed ^ (mixed >>> 15)) >>> 0;
    };
    this.state = [nextState(), nextState(), nextState(), nextState()];
    if (this.state.every((entry) => entry === 0)) this.state[0] = 1;
  }

  next(): number {
    const [a, b, c, d] = this.state;
    const result = (((a + b) | 0) + d) | 0;
    const nextD = (d + 1) | 0;
    const nextA = b ^ (b >>> 9);
    const nextB = (c + (c << 3)) | 0;
    const rotatedC = ((c << 21) | (c >>> 11)) + result;
    this.state[0] = nextA;
    this.state[1] = nextB;
    this.state[2] = rotatedC | 0;
    this.state[3] = nextD;
    return (result >>> 0) / 4_294_967_296;
  }

  normal(): number {
    if (this.spare !== undefined) {
      const spare = this.spare;
      this.spare = undefined;
      return spare;
    }
    const left = Math.max(this.next(), Number.EPSILON);
    const right = this.next();
    const magnitude = Math.sqrt(-2 * Math.log(left));
    const angle = 2 * Math.PI * right;
    this.spare = Math.max(-8, Math.min(8, magnitude * Math.sin(angle)));
    return Math.max(-8, Math.min(8, magnitude * Math.cos(angle)));
  }
}

function cholesky(matrix: readonly (readonly number[])[]): number[][] {
  const size = matrix.length;
  if (size === 0 || matrix.some((row) => row.length !== size)) {
    throw new Error('Correlation matrix dimensions are invalid.');
  }
  const result = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0),
  );
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let sum = matrix[row]?.[column] ?? Number.NaN;
      for (let offset = 0; offset < column; offset += 1) {
        sum -= (result[row]?.[offset] ?? 0) * (result[column]?.[offset] ?? 0);
      }
      if (row === column) {
        if (!Number.isFinite(sum) || sum <= 0) {
          throw new Error('Correlation matrix is not positive definite.');
        }
        result[row]![column] = Math.sqrt(sum);
      } else {
        result[row]![column] = sum / (result[column]?.[column] ?? 0);
      }
    }
  }
  return result;
}

function percentile(sorted: readonly number[], probability: number): number {
  const index = Math.round(probability * (sorted.length - 1));
  return sorted[index] ?? 0;
}

export function runSimulation(
  input: SimulationInput,
  assumptions: AssumptionSet,
  seed: bigint,
  pathCount: number,
): SimulationEngineResult {
  if (!Number.isInteger(pathCount) || pathCount <= 0) {
    throw new Error('Simulation path count must be positive.');
  }
  const classes = ['CASH', 'BOND', 'EQUITY'] as const;
  const factor = cholesky(assumptions.correlation);
  const random = new SeededRandom(seed);
  const valuesByMonth = Array.from(
    { length: input.durationMonths + 1 },
    () => [] as number[],
  );
  let goalsReached = 0;

  for (let path = 0; path < pathCount; path += 1) {
    let value = input.initialAssets;
    valuesByMonth[0]?.push(value);
    for (let month = 1; month <= input.durationMonths; month += 1) {
      const independent = classes.map(() => random.normal());
      const correlated = classes.map((_, row) =>
        independent.reduce(
          (sum, normal, column) => sum + (factor[row]?.[column] ?? 0) * normal,
          0,
        ),
      );
      const portfolioFactor = input.allocation.reduce((total, allocation) => {
        const classIndex = classes.indexOf(allocation.assetClass);
        const assumption = assumptions.assets[allocation.assetClass];
        const monthlyDrift =
          (assumption.expectedAnnualReturn -
            assumption.annualFee -
            0.5 * assumption.annualVolatility ** 2) /
          12;
        const monthlyShock =
          (assumption.annualVolatility / Math.sqrt(12)) *
          (correlated[classIndex] ?? 0);
        return (
          total + allocation.weight * Math.exp(monthlyDrift + monthlyShock)
        );
      }, 0);
      value = value * portfolioFactor + input.monthlyContribution;
      if (!Number.isFinite(value) || value < 0 || value > 999_999_999_999_999) {
        throw new Error('Simulation numeric range was exceeded.');
      }
      valuesByMonth[month]?.push(value);
    }
    if (value >= input.targetAmount) goalsReached += 1;
  }

  return {
    goalProbability: goalsReached / pathCount,
    points: valuesByMonth.map((values, month) => {
      values.sort((left, right) => left - right);
      return {
        month,
        p10: percentile(values, 0.1),
        p50: percentile(values, 0.5),
        p90: percentile(values, 0.9),
      };
    }),
  };
}
