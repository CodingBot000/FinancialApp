import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from '../../identity/application/ports/identity-repository.port.js';
import type {
  OrderPage,
  OrderRequest,
  OrderView,
  PreparedOrder,
  QuoteRequest,
  QuoteView,
} from '../domain/trading-model.js';
import {
  BROKERAGE_PORT,
  BrokerageTransportError,
  type BrokeragePort,
} from './ports/brokerage.port.js';
import {
  MARKET_PRICE_PORT,
  type MarketPricePort,
} from './ports/market-price.port.js';
import {
  TRADING_REPOSITORY,
  type TradingRepository,
} from './ports/trading-repository.port.js';

export class QuoteInputError extends Error {}
export class QuoteResourceNotFoundError extends Error {}
export class IdempotencyConflictError extends Error {}
export class QuoteExpiredError extends Error {}
export class InsufficientFundsError extends Error {}

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
    @Inject(MARKET_PRICE_PORT)
    private readonly marketPrice: MarketPricePort,
    @Inject(BROKERAGE_PORT)
    private readonly brokerage: BrokeragePort,
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
    const instrumentCode = await this.repository.quoteInstrument(
      user.userId,
      input,
    );
    if (instrumentCode === undefined) throw new QuoteResourceNotFoundError();
    const unitPrice = await this.marketPrice.price(instrumentCode);
    const quote = await this.repository.createQuote(
      user.userId,
      input,
      unitPrice,
    );
    if (quote === undefined) throw new QuoteResourceNotFoundError();
    return quote;
  }

  async prepareOrder(
    principal: AuthenticatedPrincipal,
    idempotencyKey: unknown,
    request: unknown,
    traceId = 'unavailable',
  ): Promise<PreparedOrder> {
    if (
      typeof idempotencyKey !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      throw new QuoteInputError();
    }
    const input = this.validateOrder(request);
    const requestHash = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const result = await this.repository.prepareOrder(
      user.userId,
      idempotencyKey,
      requestHash,
      input,
      traceId,
    );
    if (result.kind === 'prepared') {
      if (!result.value.created) {
        return {
          created: false,
          order:
            (await this.repository.findOrder(
              user.userId,
              result.value.order.orderId,
            )) ?? result.value.order,
        };
      }
      const submission = await this.repository.submission(
        user.userId,
        result.value.order.orderId,
      );
      if (submission === undefined) throw new QuoteResourceNotFoundError();
      try {
        const external = await this.brokerage.submit({
          clientOrderId: submission.clientOrderId,
          accountId: submission.accountId,
          instrumentId: submission.instrumentId,
          quantity: submission.quantity,
        });
        if (external.clientOrderId !== submission.clientOrderId) {
          throw new BrokerageTransportError('INVALID_RESPONSE');
        }
        return {
          created: true,
          order: await this.repository.applyExternalResult(
            submission.orderId,
            external,
            'SUBMISSION',
            traceId,
          ),
        };
      } catch (error) {
        if (!(error instanceof BrokerageTransportError)) throw error;
        return {
          created: true,
          order: await this.repository.markUnknown(
            submission.orderId,
            `BROKERAGE_${error.code}`,
            traceId,
          ),
        };
      }
    }
    if (result.kind === 'idempotency_conflict') {
      throw new IdempotencyConflictError();
    }
    if (result.kind === 'quote_expired') throw new QuoteExpiredError();
    if (result.kind === 'insufficient_funds') {
      throw new InsufficientFundsError();
    }
    throw new QuoteResourceNotFoundError();
  }

  async getOrder(
    principal: AuthenticatedPrincipal,
    orderId: string,
  ): Promise<OrderView> {
    if (!this.uuid(orderId)) throw new QuoteInputError();
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const order = await this.repository.findOrder(user.userId, orderId);
    if (order === undefined) throw new QuoteResourceNotFoundError();
    return order;
  }

  async listOrders(
    principal: AuthenticatedPrincipal,
    cursor: unknown,
    limit: unknown,
  ): Promise<OrderPage> {
    if (!(
      cursor === undefined ||
      (typeof cursor === 'string' && this.uuid(cursor))
    )) {
      throw new QuoteInputError();
    }
    const parsedLimit = limit === undefined ? 20 : Number(limit);
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      throw new QuoteInputError();
    }
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    return this.repository.listOrders(user.userId, cursor, parsedLimit);
  }

  async reconcileOne(workerId: string, now = new Date()): Promise<boolean> {
    const lease = this.positiveInteger('ORDER_RECONCILIATION_LEASE_MS', 30_000);
    const claim = await this.repository.claimReconciliation(
      workerId,
      now,
      new Date(now.getTime() - lease),
    );
    if (claim === undefined) return false;
    try {
      const external = await this.brokerage.find(claim.clientOrderId);
      if (
        external.clientOrderId !== claim.clientOrderId ||
        external.quantity !== claim.quantity
      ) {
        throw new BrokerageTransportError('INVALID_RESPONSE');
      }
      if (external.status === 'UNKNOWN') {
        await this.reschedule(claim, 'ORDER_UNKNOWN', now);
      } else {
        await this.repository.applyExternalResult(
          claim.orderId,
          external,
          'RECONCILIATION',
          `reconciliation:${claim.jobId}`,
          claim.jobId,
        );
      }
    } catch (error) {
      await this.reschedule(
        claim,
        error instanceof BrokerageTransportError
          ? `BROKERAGE_${error.code}`
          : 'RECONCILIATION_FAILED',
        now,
      );
    }
    return true;
  }

  private async reschedule(
    claim: Parameters<TradingRepository['rescheduleReconciliation']>[0],
    reasonCode: string,
    now: Date,
  ): Promise<void> {
    const backoff = this.positiveInteger(
      'ORDER_RECONCILIATION_BACKOFF_MS',
      5000,
    );
    const maxAttempts = this.positiveInteger(
      'ORDER_RECONCILIATION_MAX_ATTEMPTS',
      3,
    );
    await this.repository.rescheduleReconciliation(
      claim,
      reasonCode,
      new Date(now.getTime() + backoff * claim.attempt),
      maxAttempts,
    );
  }

  private positiveInteger(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }

  private uuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
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

  private validateOrder(request: unknown): OrderRequest {
    const quote = this.validate(request);
    if (
      !isRecord(request) ||
      typeof request.quoteId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        request.quoteId,
      )
    ) {
      throw new QuoteInputError();
    }
    const [whole = '0', fraction = ''] = quote.quantity.split('.');
    return {
      quoteId: request.quoteId,
      accountId: quote.accountId,
      instrumentId: quote.instrumentId,
      side: 'BUY',
      quantity: `${whole}.${fraction.padEnd(8, '0')}`,
    };
  }
}
