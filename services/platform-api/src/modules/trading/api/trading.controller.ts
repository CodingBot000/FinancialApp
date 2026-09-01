import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import { CircuitOpenError } from '../../../core/resilience/circuit-breaker.js';
import {
  IdempotencyConflictError,
  InsufficientFundsError,
  QuoteInputError,
  QuoteExpiredError,
  QuoteResourceNotFoundError,
  TradingService,
} from '../application/trading.service.js';
import type {
  OrderPage,
  OrderView,
  QuoteView,
} from '../domain/trading-model.js';

function problem(status: number, code: string, detail: string) {
  return {
    type: `https://wealth-sandbox.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .toLowerCase()
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' '),
    status,
    code,
    detail,
    traceId: 'unavailable',
    retryable: false,
    fieldErrors: [],
  };
}

@Controller('/api/v1/orders')
@UseGuards(OidcJwtGuard)
export class TradingController {
  constructor(
    @Inject(TradingService)
    private readonly tradingService: TradingService,
  ) {}

  @Post('/preview')
  @RequiredScopes('order.execute')
  async preview(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
  ): Promise<QuoteView> {
    try {
      return await this.tradingService.preview(principal, body);
    } catch (error: unknown) {
      if (error instanceof QuoteInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Quote request is invalid.'),
        );
      }
      if (error instanceof QuoteResourceNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      if (error instanceof CircuitOpenError) {
        throw new ServiceUnavailableException(
          problem(
            503,
            'UPSTREAM_CIRCUIT_OPEN',
            'The synthetic market provider is temporarily unavailable.',
          ),
        );
      }
      throw error;
    }
  }

  @Post()
  @RequiredScopes('order.execute')
  async prepareOrder(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-correlation-id') traceId: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<OrderView> {
    try {
      const result = await this.tradingService.prepareOrder(
        principal,
        idempotencyKey,
        body,
        traceId,
      );
      response.code(
        result.created ? (result.order.status === 'UNKNOWN' ? 202 : 201) : 200,
      );
      return result.order;
    } catch (error: unknown) {
      if (error instanceof QuoteInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Order request is invalid.'),
        );
      }
      if (error instanceof QuoteResourceNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      if (error instanceof IdempotencyConflictError) {
        throw new ConflictException(
          problem(
            409,
            'IDEMPOTENCY_CONFLICT',
            'The idempotency key was used with another request.',
          ),
        );
      }
      if (error instanceof QuoteExpiredError) {
        throw new ConflictException(
          problem(409, 'QUOTE_EXPIRED', 'The quote has expired.'),
        );
      }
      if (error instanceof InsufficientFundsError) {
        throw new ConflictException(
          problem(409, 'INSUFFICIENT_FUNDS', 'Available cash is insufficient.'),
        );
      }
      throw error;
    }
  }

  @Get('/:orderId')
  @RequiredScopes('financial.read')
  async getOrder(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('orderId') orderId: string,
  ): Promise<OrderView> {
    try {
      return await this.tradingService.getOrder(principal, orderId);
    } catch (error) {
      if (error instanceof QuoteInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Order ID is invalid.'),
        );
      }
      if (error instanceof QuoteResourceNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      throw error;
    }
  }

  @Get()
  @RequiredScopes('financial.read')
  async listOrders(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<OrderPage> {
    try {
      return await this.tradingService.listOrders(principal, cursor, limit);
    } catch (error) {
      if (error instanceof QuoteInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Order query is invalid.'),
        );
      }
      throw error;
    }
  }
}
