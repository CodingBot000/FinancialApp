import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import {
  WealthInputError,
  WealthResourceNotFoundError,
  WealthService,
} from '../application/wealth.service.js';
import type {
  AccountView,
  AssetHistoryPoint,
  AssetSummaryView,
  HoldingView,
  TransactionView,
} from '../domain/wealth-views.js';

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

@Controller('/api/v1')
@UseGuards(OidcJwtGuard)
@RequiredScopes('financial.read')
export class WealthController {
  constructor(
    @Inject(WealthService) private readonly wealthService: WealthService,
  ) {}

  @Get('/assets/summary')
  summary(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<AssetSummaryView> {
    return this.wealthService.summary(principal);
  }

  @Get('/accounts')
  async accounts(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return {
      items: await this.wealthService.accounts(principal),
      nextCursor: null,
    } satisfies {
      readonly items: readonly AccountView[];
      readonly nextCursor: null;
    };
  }

  @Get('/accounts/:accountId')
  async account(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('accountId') accountId: string,
  ): Promise<AccountView> {
    try {
      return await this.wealthService.account(principal, accountId);
    } catch (error: unknown) {
      if (error instanceof WealthResourceNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      throw error;
    }
  }

  @Get('/holdings')
  async holdings(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query('accountId') accountId?: string,
  ) {
    return {
      items: await this.wealthService.holdings(principal, accountId),
      nextCursor: null,
    } satisfies {
      readonly items: readonly HoldingView[];
      readonly nextCursor: null;
    };
  }

  @Get('/transactions')
  async transactions(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return {
      items: await this.wealthService.transactions(principal),
      nextCursor: null,
    } satisfies {
      readonly items: readonly TransactionView[];
      readonly nextCursor: null;
    };
  }

  @Get('/assets/history')
  async history(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query('range') range?: string,
  ): Promise<{ readonly points: readonly AssetHistoryPoint[] }> {
    try {
      return {
        points: await this.wealthService.history(principal, range ?? '1Y'),
      };
    } catch (error: unknown) {
      if (error instanceof WealthInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Asset history range is invalid.'),
        );
      }
      throw error;
    }
  }
}
