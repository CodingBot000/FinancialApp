import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';

import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import {
  MarketDataInvalidError,
  MarketProviderUnavailableError,
  MarketRateLimitedError,
  MarketStockNotFoundError,
} from '../domain/market-errors.js';
import {
  MARKET_INTERVALS,
  type MarketInterval,
} from '../domain/market-model.js';
import { MarketService } from '../application/market.service.js';

function problem(
  status: number,
  code: string,
  detail: string,
  retryable: boolean,
) {
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
    retryable,
    fieldErrors: [],
  };
}

@Controller('/api/v1/market')
@UseGuards(OidcJwtGuard)
@RequiredScopes('market.read')
export class MarketController {
  constructor(@Inject(MarketService) private readonly market: MarketService) {}

  @Get('/stocks')
  async searchStocks(
    @Query('q') query: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    const normalizedQuery = query?.trim() ?? '';
    const normalizedLimit = parseLimit(limit);
    if (
      normalizedQuery.length < 1 ||
      normalizedQuery.length > 50 ||
      normalizedLimit === 0
    ) {
      throw new BadRequestException(
        problem(
          400,
          'VALIDATION_FAILED',
          'Stock search query is invalid.',
          false,
        ),
      );
    }
    return {
      stocks: await this.market.searchStocks(normalizedQuery, normalizedLimit),
    };
  }

  @Get('/stocks/:symbol/quote')
  async quote(@Param('symbol') symbol: string) {
    try {
      return { quote: await this.market.quote(symbol) };
    } catch (error: unknown) {
      throw this.httpError(error);
    }
  }

  @Get('/stocks/:symbol/bars')
  bars(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string | undefined,
  ) {
    const normalizedInterval = interval ?? 'DAILY';
    if (!MARKET_INTERVALS.includes(normalizedInterval as MarketInterval)) {
      throw new BadRequestException(
        problem(400, 'VALIDATION_FAILED', 'Market interval is invalid.', false),
      );
    }
    return this.market
      .bars(symbol, normalizedInterval as MarketInterval)
      .catch((error: unknown) => {
        throw this.httpError(error);
      });
  }

  private httpError(error: unknown): Error {
    if (error instanceof MarketStockNotFoundError) {
      return new BadRequestException(
        problem(
          404,
          'MARKET_STOCK_NOT_FOUND',
          'Market stock was not found.',
          false,
        ),
      );
    }
    if (error instanceof MarketRateLimitedError) {
      return new HttpException(
        problem(
          429,
          'MARKET_RATE_LIMITED',
          'Market data provider is rate limited.',
          true,
        ),
        429,
      );
    }
    if (error instanceof MarketProviderUnavailableError) {
      return new ServiceUnavailableException(
        problem(
          503,
          'MARKET_PROVIDER_UNAVAILABLE',
          'Market data provider is unavailable.',
          true,
        ),
      );
    }
    if (error instanceof MarketDataInvalidError) {
      return new BadGatewayException(
        problem(
          502,
          'MARKET_DATA_INVALID',
          'Market data provider returned invalid data.',
          false,
        ),
      );
    }
    return error instanceof Error ? error : new Error('Market request failed.');
  }
}

function parseLimit(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 20;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : 0;
}
