import { Controller, Get, Inject, Param } from '@nestjs/common';

import type { AccountRepository } from './account.repository.js';
import { AccountRepository as AccountRepositoryToken } from './account.repository.js';

@Controller('/sim/v1/mydata/customers/:externalCustomerId')
export class AccountController {
  constructor(
    @Inject(AccountRepositoryToken)
    private readonly repository: AccountRepository,
  ) {}

  @Get('/accounts')
  async accounts(@Param('externalCustomerId') externalCustomerId: string) {
    return {
      schemaVersion: 'simulator-v1',
      items: await this.repository.accounts(externalCustomerId),
      nextCursor: null,
    };
  }

  @Get('/holdings')
  async holdings(@Param('externalCustomerId') externalCustomerId: string) {
    const items = await this.repository.holdings(externalCustomerId);
    return {
      schemaVersion: 'simulator-v1',
      items: items.map((item) => ({
        ...item,
        asOfAt: item.asOfAt.toISOString(),
      })),
      nextCursor: null,
    };
  }

  @Get('/transactions')
  async transactions(@Param('externalCustomerId') externalCustomerId: string) {
    const items = await this.repository.transactions(externalCustomerId);
    return {
      schemaVersion: 'simulator-v1',
      items: items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
      })),
      nextCursor: null,
    };
  }
}
