import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

import { DatabaseLifecycleService } from './database-lifecycle.service.js';
import { PLATFORM_DATABASE_POOL } from './database.tokens.js';

@Global()
@Module({
  exports: [PLATFORM_DATABASE_POOL],
  providers: [
    {
      provide: PLATFORM_DATABASE_POOL,
      useFactory: (): Pool =>
        new Pool({
          connectionString:
            process.env.PLATFORM_DATABASE_URL ??
            'postgresql://financial_platform_app:example-local-only@localhost:5433/financial_app',
          max: Number.parseInt(process.env.PLATFORM_DB_POOL_MAX ?? '10', 10),
        }),
    },
    DatabaseLifecycleService,
  ],
})
export class DatabaseModule {}
