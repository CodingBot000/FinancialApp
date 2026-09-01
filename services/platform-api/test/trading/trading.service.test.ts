import { describe, expect, it, vi } from 'vitest';

import {
  IdempotencyConflictError,
  QuoteInputError,
  QuoteResourceNotFoundError,
  TradingService,
} from '../../src/modules/trading/application/trading.service.js';

const principal = {
  issuer: 'https://issuer.example/realms/finapp',
  subject: 'quote-user',
  scopes: new Set(['order.execute']),
};

describe('TradingService quote preview', () => {
  const identity = {
    provisionFromOidc: vi.fn().mockResolvedValue({ userId: 'user-a' }),
  };

  it.each([
    {},
    {
      accountId: 'not-a-uuid',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      side: 'BUY',
      quantity: '3.00000000',
    },
    {
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      side: 'SELL',
      quantity: '3.00000000',
    },
    {
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      side: 'BUY',
      quantity: '0',
    },
    {
      accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      side: 'BUY',
      quantity: '1.000000001',
    },
  ])('rejects an invalid request %#', async (request) => {
    const repository = { createQuote: vi.fn(), prepareOrder: vi.fn() };
    const service = new TradingService(identity, repository);

    await expect(service.preview(principal, request)).rejects.toBeInstanceOf(
      QuoteInputError,
    );
    expect(repository.createQuote).not.toHaveBeenCalled();
  });

  it('does not reveal a quote resource owned by another user', async () => {
    const repository = {
      createQuote: vi.fn().mockResolvedValue(undefined),
      prepareOrder: vi.fn(),
    };
    const service = new TradingService(identity, repository);

    await expect(
      service.preview(principal, {
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
        side: 'BUY',
        quantity: '3.00000000',
      }),
    ).rejects.toBeInstanceOf(QuoteResourceNotFoundError);
  });

  it('returns an immutable synthetic quote view', async () => {
    const quote = {
      quoteId: 'd228553f-f10a-47ad-89f6-77be8e034324',
      side: 'BUY' as const,
      quantity: '3.00000000',
      unitPrice: '125000.0000',
      estimatedAmount: '375000.0000',
      fee: '0.0000',
      currency: 'KRW' as const,
      expiresAt: '2026-09-02T00:01:00.000Z',
      syntheticQuote: true as const,
    };
    const repository = {
      createQuote: vi.fn().mockResolvedValue(quote),
      prepareOrder: vi.fn(),
    };
    const service = new TradingService(identity, repository);

    await expect(
      service.preview(principal, {
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
        side: 'BUY',
        quantity: '3',
      }),
    ).resolves.toEqual(quote);
  });

  it('normalizes the order quantity before hashing and preparing', async () => {
    const order = {
      orderId: '23df8759-92ef-45fc-8015-ef891e4e8757',
      status: 'PENDING_SUBMISSION' as const,
      side: 'BUY' as const,
      quantity: '3.00000000',
      estimatedAmount: '375000.0000',
      filledAmount: null,
      createdAt: '2026-09-02T00:00:20.000Z',
      updatedAt: '2026-09-02T00:00:20.000Z',
      statusRefreshRecommendedAfterMs: 2000 as const,
    };
    const repository = {
      createQuote: vi.fn(),
      prepareOrder: vi.fn().mockResolvedValue({
        kind: 'prepared',
        value: { created: true, order },
      }),
    };
    const service = new TradingService(identity, repository);
    await expect(
      service.prepareOrder(principal, '90000000-0000-4000-8000-000000000001', {
        quoteId: 'd228553f-f10a-47ad-89f6-77be8e034324',
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
        side: 'BUY',
        quantity: '3',
      }),
    ).resolves.toEqual({ created: true, order });
    expect(repository.prepareOrder).toHaveBeenCalledWith(
      'user-a',
      '90000000-0000-4000-8000-000000000001',
      expect.stringMatching(/^[0-9a-f]{64}$/),
      expect.objectContaining({ quantity: '3.00000000' }),
    );
  });

  it('maps repository idempotency conflicts to a domain error', async () => {
    const repository = {
      createQuote: vi.fn(),
      prepareOrder: vi.fn().mockResolvedValue({ kind: 'idempotency_conflict' }),
    };
    const service = new TradingService(identity, repository);
    await expect(
      service.prepareOrder(principal, '90000000-0000-4000-8000-000000000001', {
        quoteId: 'd228553f-f10a-47ad-89f6-77be8e034324',
        accountId: '688c601b-ab70-4683-9dd4-6a1174550653',
        instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
        side: 'BUY',
        quantity: '3',
      }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });
});
