import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import {
  QuoteInputError,
  QuoteResourceNotFoundError,
  TradingService,
} from '../application/trading.service.js';
import type { QuoteView } from '../domain/trading-model.js';

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
      throw error;
    }
  }
}
