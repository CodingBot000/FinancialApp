import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { WealthController } from './api/wealth.controller.js';
import { WEALTH_REPOSITORY } from './application/ports/wealth-repository.port.js';
import { WealthService } from './application/wealth.service.js';
import { DrizzleWealthRepository } from './infrastructure/persistence/drizzle-wealth.repository.js';

@Module({
  controllers: [WealthController],
  imports: [AuthModule, DatabaseModule, IdentityModule],
  providers: [
    WealthService,
    { provide: WEALTH_REPOSITORY, useClass: DrizzleWealthRepository },
  ],
})
export class WealthModule {}
