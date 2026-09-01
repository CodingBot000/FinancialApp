export interface PlatformMetricSnapshot {
  readonly httpRequestsTotal: number;
  readonly httpResponses5xxTotal: number;
  readonly externalRequestFailuresTotal: number;
  readonly circuitRejectedTotal: number;
  readonly circuitOpenedTotal: number;
}

const counters: Record<keyof PlatformMetricSnapshot, number> = {
  httpRequestsTotal: 0,
  httpResponses5xxTotal: 0,
  externalRequestFailuresTotal: 0,
  circuitRejectedTotal: 0,
  circuitOpenedTotal: 0,
};

export const platformMetrics = {
  increment(name: keyof PlatformMetricSnapshot): void {
    counters[name] += 1;
  },
  snapshot(): PlatformMetricSnapshot {
    return { ...counters };
  },
  resetForTest(): void {
    for (const name of Object.keys(
      counters,
    ) as (keyof PlatformMetricSnapshot)[])
      counters[name] = 0;
  },
};
