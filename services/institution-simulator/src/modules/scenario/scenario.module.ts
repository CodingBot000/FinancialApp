import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module.js';
import { AccountModule } from '../account/account.module.js';
import { SCENARIO_REPOSITORY } from './application/ports/scenario-repository.port.js';
import { ScenarioService } from './application/scenario.service.js';
import { DrizzleScenarioRepository } from './infrastructure/persistence/drizzle-scenario.repository.js';
import { ScenarioController } from './scenario.controller.js';

@Module({
  controllers: [ScenarioController],
  exports: [ScenarioService],
  imports: [AccountModule, DatabaseModule],
  providers: [
    ScenarioService,
    { provide: SCENARIO_REPOSITORY, useClass: DrizzleScenarioRepository },
  ],
})
export class ScenarioModule {}
