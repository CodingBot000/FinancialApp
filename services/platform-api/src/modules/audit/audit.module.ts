import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module.js';
import { AuditService } from './audit.service.js';
import { SecurityEventService } from './security-event.service.js';

@Global()
@Module({
  exports: [AuditService, SecurityEventService],
  imports: [DatabaseModule],
  providers: [AuditService, SecurityEventService],
})
export class AuditModule {}
