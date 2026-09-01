import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module.js';
import { ScenarioModule } from '../scenario/scenario.module.js';
import { BROKERAGE_REPOSITORY } from './application/ports/brokerage-repository.port.js';
import { BrokerageService } from './application/brokerage.service.js';
import { BrokerageController } from './brokerage.controller.js';
import { PostgresBrokerageRepository } from './infrastructure/persistence/postgres-brokerage.repository.js';

@Module({
  controllers: [BrokerageController],
  imports: [DatabaseModule, ScenarioModule],
  providers: [
    BrokerageService,
    { provide: BROKERAGE_REPOSITORY, useClass: PostgresBrokerageRepository },
  ],
})
export class TradingModule {}
