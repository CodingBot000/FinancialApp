import { describe, expect, it } from 'vitest';

import fixture from './mock/fixtures/wealth-dashboard.success.json';
import simulationFixture from './mock/fixtures/simulation.success.json';
import {
  isAccount,
  isAccountPage,
  isConnections,
  isHistory,
  isHoldingPage,
  isSummary,
  isSimulation,
  isSync,
  isTransactionPage,
} from './platform-api-contract';

describe('platform-v1 wealth response guards', () => {
  it('accepts every canonical FE-0011 fixture shape', () => {
    expect(isConnections([fixture.connection])).toBe(true);
    expect(isSync(fixture.sync)).toBe(true);
    expect(isSummary(fixture.summary)).toBe(true);
    expect(isAccountPage({ items: fixture.accounts, nextCursor: null })).toBe(
      true,
    );
    expect(isHoldingPage({ items: fixture.holdings, nextCursor: null })).toBe(
      true,
    );
    expect(
      isTransactionPage({ items: fixture.transactions, nextCursor: null }),
    ).toBe(true);
    expect(isHistory({ points: fixture.history })).toBe(true);
    expect(isSimulation(simulationFixture)).toBe(true);
  });

  it('rejects non-canonical money, cursors, extra keys, and raw identifiers', () => {
    expect(isSummary({ ...fixture.summary, totalAssets: '185400000' })).toBe(
      false,
    );
    expect(
      isAccountPage({ items: fixture.accounts, nextCursor: 'opaque' }),
    ).toBe(false);
    expect(isSync({ ...fixture.sync, unexpected: true })).toBe(false);
    expect(
      isSimulation({
        ...simulationFixture,
        finalValue: { ...simulationFixture.finalValue, p10: '999999999.0000' },
      }),
    ).toBe(false);
    expect(
      isAccount({
        ...fixture.accounts[0],
        maskedAccountNumber: '1234567890',
      }),
    ).toBe(false);
  });
});
