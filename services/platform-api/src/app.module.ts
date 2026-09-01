import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { MyDataModule } from './modules/mydata/mydata.module.js';
import { SimulationModule } from './modules/simulation/simulation.module.js';
import { WealthModule } from './modules/wealth/wealth.module.js';

@Module({
  imports: [
    HealthModule,
    IdentityModule,
    MyDataModule,
    WealthModule,
    SimulationModule,
  ],
})
export class AppModule {}
