import { Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from '../../identity/application/ports/identity-repository.port.js';
import type {
  AccountView,
  AssetHistoryPoint,
  AssetSummaryView,
  HoldingView,
  TransactionView,
} from '../domain/wealth-views.js';
import {
  WEALTH_REPOSITORY,
  type WealthRepository,
} from './ports/wealth-repository.port.js';

export class WealthInputError extends Error {}
export class WealthResourceNotFoundError extends Error {}

@Injectable()
export class WealthService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
    @Inject(WEALTH_REPOSITORY)
    private readonly repository: WealthRepository,
  ) {}

  async summary(principal: AuthenticatedPrincipal): Promise<AssetSummaryView> {
    return this.repository.summary(await this.userId(principal));
  }

  async accounts(
    principal: AuthenticatedPrincipal,
  ): Promise<readonly AccountView[]> {
    return this.repository.accounts(await this.userId(principal));
  }

  async account(
    principal: AuthenticatedPrincipal,
    accountId: string,
  ): Promise<AccountView> {
    const account = await this.repository.account(
      await this.userId(principal),
      accountId,
    );
    if (account === undefined) throw new WealthResourceNotFoundError();
    return account;
  }

  async holdings(
    principal: AuthenticatedPrincipal,
    accountId?: string,
  ): Promise<readonly HoldingView[]> {
    return this.repository.holdings(await this.userId(principal), accountId);
  }

  async transactions(
    principal: AuthenticatedPrincipal,
  ): Promise<readonly TransactionView[]> {
    return this.repository.transactions(await this.userId(principal));
  }

  async history(
    principal: AuthenticatedPrincipal,
    range: string,
  ): Promise<readonly AssetHistoryPoint[]> {
    if (!['1M', '3M', '1Y', 'ALL'].includes(range)) {
      throw new WealthInputError();
    }
    return this.repository.history(
      await this.userId(principal),
      range as '1M' | '3M' | '1Y' | 'ALL',
    );
  }

  private async userId(principal: AuthenticatedPrincipal): Promise<string> {
    return (
      await this.identityRepository.provisionFromOidc(
        principal.issuer,
        principal.subject,
      )
    ).userId;
  }
}
