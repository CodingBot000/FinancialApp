import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SimulationController } from './api/simulation.controller.js';
import { SIMULATION_REPOSITORY } from './application/ports/simulation-repository.port.js';
import { SimulationService } from './application/simulation.service.js';
import { DrizzleSimulationRepository } from './infrastructure/persistence/drizzle-simulation.repository.js';

@Module({
  controllers: [SimulationController],
  imports: [AuthModule, DatabaseModule, IdentityModule],
  providers: [
    SimulationService,
    { provide: SIMULATION_REPOSITORY, useClass: DrizzleSimulationRepository },
  ],
})
export class SimulationModule {}
