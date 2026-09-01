import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { MeController } from './api/me.controller.js';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case.js';
import { RiskProfileService } from './application/risk-profile.service.js';
import { IDENTITY_REPOSITORY } from './application/ports/identity-repository.port.js';
import { RISK_PROFILE_REPOSITORY } from './application/ports/risk-profile-repository.port.js';
import { DrizzleIdentityRepository } from './infrastructure/persistence/drizzle-identity.repository.js';

@Module({
  controllers: [MeController],
  exports: [IDENTITY_REPOSITORY],
  imports: [AuthModule, DatabaseModule],
  providers: [
    GetCurrentUserUseCase,
    RiskProfileService,
    DrizzleIdentityRepository,
    {
      provide: IDENTITY_REPOSITORY,
      useExisting: DrizzleIdentityRepository,
    },
    {
      provide: RISK_PROFILE_REPOSITORY,
      useExisting: DrizzleIdentityRepository,
    },
  ],
})
export class IdentityModule {}
