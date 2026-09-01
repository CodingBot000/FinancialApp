import { describe, expect, it, vi } from 'vitest';

import {
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
    const repository = { createQuote: vi.fn() };
    const service = new TradingService(identity, repository);

    await expect(service.preview(principal, request)).rejects.toBeInstanceOf(
      QuoteInputError,
    );
    expect(repository.createQuote).not.toHaveBeenCalled();
  });

  it('does not reveal a quote resource owned by another user', async () => {
    const repository = { createQuote: vi.fn().mockResolvedValue(undefined) };
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
    const repository = { createQuote: vi.fn().mockResolvedValue(quote) };
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
});
