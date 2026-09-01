import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module.js';
import { AuditService } from './audit.service.js';

@Module({
  exports: [AuditService],
  imports: [DatabaseModule],
  providers: [AuditService],
})
export class AuditModule {}
