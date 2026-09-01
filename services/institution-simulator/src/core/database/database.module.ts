import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

import { DatabaseLifecycleService } from './database-lifecycle.service.js';
import { SIMULATOR_DATABASE_POOL } from './database.tokens.js';

@Global()
@Module({
  exports: [SIMULATOR_DATABASE_POOL],
  providers: [
    {
      provide: SIMULATOR_DATABASE_POOL,
      useFactory: (): Pool =>
        new Pool({
          connectionString:
            process.env.SIMULATOR_DATABASE_URL ??
            'postgresql://financial_simulator_app:example-local-only@localhost:5433/financial_app',
          max: Number.parseInt(process.env.SIMULATOR_DB_POOL_MAX ?? '5', 10),
        }),
    },
    DatabaseLifecycleService,
  ],
})
export class DatabaseModule {}
