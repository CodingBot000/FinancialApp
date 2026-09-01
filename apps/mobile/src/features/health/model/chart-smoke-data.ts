export type ChartSmokePoint = {
  readonly assets: number;
  readonly month: number;
};

export const chartSmokeData: readonly ChartSmokePoint[] = [
  { assets: 100, month: 0 },
  { assets: 112, month: 1 },
  { assets: 108, month: 2 },
  { assets: 126, month: 3 },
  { assets: 137, month: 4 },
  { assets: 151, month: 5 },
];
