import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health/health.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { MarketModule } from './modules/market/market.module.js';
import { ScenarioModule } from './modules/scenario/scenario.module.js';
import { TradingModule } from './modules/trading/trading.module.js';

@Module({
  imports: [
    AccountModule,
    HealthModule,
    MarketModule,
    ScenarioModule,
    TradingModule,
  ],
})
export class AppModule {}
