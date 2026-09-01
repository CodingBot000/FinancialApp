import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health/health.module.js';
import { AccountModule } from './modules/account/account.module.js';

@Module({
  imports: [AccountModule, HealthModule],
})
export class AppModule {}
