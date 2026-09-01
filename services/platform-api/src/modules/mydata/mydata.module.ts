import { Module } from '@nestjs/common';

import { AuthModule } from '../../core/auth/auth.module.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MyDataController } from './api/mydata.controller.js';
import { MyDataService } from './application/mydata.service.js';
import { INSTITUTION_PORT } from './application/ports/institution.port.js';
import { MYDATA_REPOSITORY } from './application/ports/mydata-repository.port.js';
import { SENSITIVE_DATA_PORT } from './application/ports/sensitive-data.port.js';
import { AesSensitiveDataAdapter } from './infrastructure/crypto/aes-sensitive-data.adapter.js';
import { SimulatorInstitutionAdapter } from './infrastructure/http/simulator-institution.adapter.js';
import { DrizzleMyDataRepository } from './infrastructure/persistence/drizzle-mydata.repository.js';

@Module({
  controllers: [MyDataController],
  imports: [AuthModule, DatabaseModule, IdentityModule],
  providers: [
    MyDataService,
    { provide: MYDATA_REPOSITORY, useClass: DrizzleMyDataRepository },
    { provide: INSTITUTION_PORT, useClass: SimulatorInstitutionAdapter },
    { provide: SENSITIVE_DATA_PORT, useClass: AesSensitiveDataAdapter },
  ],
})
export class MyDataModule {}
