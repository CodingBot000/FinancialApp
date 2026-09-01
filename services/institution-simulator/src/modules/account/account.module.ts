import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module.js';
import { AccountController } from './account.controller.js';
import { AccountRepository } from './account.repository.js';

@Module({
  controllers: [AccountController],
  exports: [AccountRepository],
  imports: [DatabaseModule],
  providers: [AccountRepository],
})
export class AccountModule {}
