import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { DeveloperController } from './api/developer.controller.js';
import { DeveloperAccessGuard } from './api/developer-access.guard.js';
import { DeveloperService } from './application/developer.service.js';
import { SIMULATOR_ADMIN_PORT } from './application/ports/simulator-admin.port.js';
import { SimulatorAdminAdapter } from './infrastructure/http/simulator-admin.adapter.js';

@Module({
  controllers: [DeveloperController],
  imports: [AuditModule, AuthModule],
  providers: [
    DeveloperAccessGuard,
    DeveloperService,
    { provide: SIMULATOR_ADMIN_PORT, useClass: SimulatorAdminAdapter },
  ],
})
export class DeveloperModule {}
