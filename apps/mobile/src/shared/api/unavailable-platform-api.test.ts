import { describe, expect, it } from 'vitest';

import { UnavailablePlatformApi } from './unavailable-platform-api';

describe('UnavailablePlatformApi', () => {
  it('implements public and authenticated ports without starting a request', async () => {
    const api = new UnavailablePlatformApi('공개 설정 누락');

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'configuration',
      retryable: false,
    });
    await expect(api.getCurrentUser()).rejects.toMatchObject({
      kind: 'configuration',
      retryable: false,
    });
    await expect(api.getAssetSummary()).rejects.toMatchObject({
      kind: 'configuration',
      retryable: false,
    });
    await expect(
      api.createSimulation({
        allocation: [{ assetClass: 'CASH', weight: 1 }],
        durationMonths: 1,
        initialAssets: '0',
        monthlyContribution: '0',
        targetAmount: '0',
      }),
    ).rejects.toMatchObject({ kind: 'configuration' });
  });
});
