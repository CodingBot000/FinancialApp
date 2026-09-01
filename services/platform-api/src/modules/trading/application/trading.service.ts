import { Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from '../../identity/application/ports/identity-repository.port.js';
import type { QuoteRequest, QuoteView } from '../domain/trading-model.js';
import {
  TRADING_REPOSITORY,
  type TradingRepository,
} from './ports/trading-repository.port.js';

export class QuoteInputError extends Error {}
export class QuoteResourceNotFoundError extends Error {}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class TradingService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
    @Inject(TRADING_REPOSITORY)
    private readonly repository: TradingRepository,
  ) {}

  async preview(
    principal: AuthenticatedPrincipal,
    request: unknown,
  ): Promise<QuoteView> {
    const input = this.validate(request);
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const quote = await this.repository.createQuote(user.userId, input);
    if (quote === undefined) throw new QuoteResourceNotFoundError();
    return quote;
  }

  private validate(request: unknown): QuoteRequest {
    if (
      !isRecord(request) ||
      typeof request.accountId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request.accountId,
      ) ||
      typeof request.instrumentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request.instrumentId,
      ) ||
      request.side !== 'BUY' ||
      typeof request.quantity !== 'string' ||
      !/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(request.quantity) ||
      Number(request.quantity) <= 0 ||
      Number(request.quantity) > 999_999_999
    ) {
      throw new QuoteInputError();
    }
    return {
      accountId: request.accountId,
      instrumentId: request.instrumentId,
      side: 'BUY',
      quantity: request.quantity,
    };
  }
}
