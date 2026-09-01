import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MeController } from './api/me.controller.js';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case.js';
import { IDENTITY_REPOSITORY } from './application/ports/identity-repository.port.js';
import { DrizzleIdentityRepository } from './infrastructure/persistence/drizzle-identity.repository.js';

@Module({
  controllers: [MeController],
  exports: [IDENTITY_REPOSITORY],
  imports: [AuthModule, DatabaseModule],
  providers: [
    GetCurrentUserUseCase,
    {
      provide: IDENTITY_REPOSITORY,
      useClass: DrizzleIdentityRepository,
    },
  ],
})
export class IdentityModule {}
