import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { MyDataModule } from './modules/mydata/mydata.module.js';
import { SimulationModule } from './modules/simulation/simulation.module.js';
import { TradingModule } from './modules/trading/trading.module.js';
import { WealthModule } from './modules/wealth/wealth.module.js';
import { DeveloperModule } from './modules/developer/developer.module.js';

const environmentModules =
  process.env.APP_ENV === 'production' ? [] : [DeveloperModule];

@Module({
  imports: [
    HealthModule,
    IdentityModule,
    MyDataModule,
    WealthModule,
    SimulationModule,
    TradingModule,
    ...environmentModules,
  ],
})
export class AppModule {}
