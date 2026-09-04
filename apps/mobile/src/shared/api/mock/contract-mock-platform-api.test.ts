import { describe, expect, it } from 'vitest';

import { ContractMockPlatformApi } from './contract-mock-platform-api';

describe('ContractMockPlatformApi', () => {
  it('sets and resets deterministic developer scenarios', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    await expect(api.setDeveloperScenario('HTTP_500')).resolves.toEqual({
      mode: 'HTTP_500',
      scope: 'GLOBAL',
    });
    await expect(api.resetDeveloperDataset()).resolves.toMatchObject({
      scenarioMode: 'NORMAL',
      syntheticData: true,
    });
  });

  it('returns the canonical FE-0011 wealth fixtures', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const accounts = await api.listAccounts();
    await expect(api.getAssetSummary()).resolves.toMatchObject({
      currency: 'KRW',
      totalAssets: '185400000.0000',
    });
    await expect(api.listMyDataConnections()).resolves.toHaveLength(1);
    await expect(
      api.getAccount(accounts.items[0]!.accountId),
    ).resolves.toMatchObject({ maskedAccountNumber: '***-**-0001' });
    await expect(api.getAssetHistory()).resolves.toHaveLength(2);
  });
  it('creates and reloads the canonical persisted simulation fixture', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const created = await api.createSimulation({
      allocation: [{ assetClass: 'EQUITY', weight: 1 }],
      durationMonths: 12,
      initialAssets: '1',
      monthlyContribution: '1',
      targetAmount: '2',
    });

    await expect(api.getSimulation(created.simulationId)).resolves.toEqual(
      created,
    );
  });
  it('previews, submits, reads, and lists a deterministic BUY order', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const input = {
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      quantity: '8.00000000',
      side: 'BUY' as const,
    };
    const quote = await api.previewBuyOrder(input);
    expect(quote).toMatchObject({
      estimatedAmount: '1000000.0000',
      quantity: '8.00000000',
    });
    const order = await api.prepareBuyOrder(
      { ...input, quoteId: quote.quoteId },
      '92000000-0000-4000-8000-000000000001',
    );
    await expect(api.getOrder(order.orderId)).resolves.toEqual(order);
    await expect(api.listOrders()).resolves.toMatchObject({ items: [order] });
  });
  it('returns the canonical synthetic current user fixture', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });

    await expect(api.getCurrentUser()).resolves.toMatchObject({
      displayName: '테스트 사용자 A',
      riskProfile: 'BALANCED',
      syntheticData: true,
    });
  });

  it('returns the deterministic platform health fixture', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });

    await expect(api.getHealth()).resolves.toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
  });

  it('honors an aborted request', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 10 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      api.getHealth({ signal: controller.signal }),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('models a retryable timeout without changing the response contract', async () => {
    const api = new ContractMockPlatformApi({
      latencyMs: 0,
      scenario: 'timeout',
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    });
  });

  it('models the documented 429 response', async () => {
    const api = new ContractMockPlatformApi({
      latencyMs: 0,
      scenario: 'rate-limited',
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'http',
      retryable: true,
      status: 429,
    });
  });
});
