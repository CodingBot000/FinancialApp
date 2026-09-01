import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  imports: [DatabaseModule],
  providers: [HealthService],
})
export class HealthModule {}
