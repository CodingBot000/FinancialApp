import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module.js';
import { ScenarioModule } from '../scenario/scenario.module.js';
import { MarketController } from './market.controller.js';
import { MarketRepository } from './market.repository.js';

@Module({
  controllers: [MarketController],
  exports: [MarketRepository],
  imports: [DatabaseModule, ScenarioModule],
  providers: [MarketRepository],
})
export class MarketModule {}
