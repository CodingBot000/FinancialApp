import { platformMetrics } from '../observability/metrics-registry.js';

export class CircuitOpenError extends Error {
  constructor(readonly circuitName: string) {
    super(`Circuit ${circuitName} is open.`);
  }
}

interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly openMilliseconds: number;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class CircuitBreaker {
  private consecutiveFailures = 0;
  private halfOpenTrialRunning = false;
  private openedUntil = 0;
  private state: CircuitState = 'CLOSED';

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: positiveInteger(
        process.env.EXTERNAL_CIRCUIT_FAILURE_THRESHOLD,
        5,
      ),
      openMilliseconds: positiveInteger(
        process.env.EXTERNAL_CIRCUIT_OPEN_MS,
        30_000,
      ),
    },
    private readonly now: () => number = Date.now,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.beforeCall();
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  snapshot(): {
    readonly name: string;
    readonly state: CircuitState;
    readonly consecutiveFailures: number;
  } {
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  private beforeCall(): void {
    if (this.state === 'OPEN' && this.now() >= this.openedUntil) {
      this.state = 'HALF_OPEN';
      this.halfOpenTrialRunning = false;
    }
    if (
      this.state === 'OPEN' ||
      (this.state === 'HALF_OPEN' && this.halfOpenTrialRunning)
    ) {
      platformMetrics.increment('circuitRejectedTotal');
      throw new CircuitOpenError(this.name);
    }
    if (this.state === 'HALF_OPEN') this.halfOpenTrialRunning = true;
  }

  private onSuccess(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.halfOpenTrialRunning = false;
  }

  private onFailure(): void {
    platformMetrics.increment('externalRequestFailuresTotal');
    this.halfOpenTrialRunning = false;
    this.consecutiveFailures += 1;
    if (
      this.state === 'HALF_OPEN' ||
      this.consecutiveFailures >= this.options.failureThreshold
    ) {
      this.state = 'OPEN';
      this.openedUntil = this.now() + this.options.openMilliseconds;
      platformMetrics.increment('circuitOpenedTotal');
    }
  }
}
