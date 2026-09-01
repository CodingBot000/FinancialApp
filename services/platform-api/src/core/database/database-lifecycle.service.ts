import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from './database.tokens.js';

@Injectable()
export class DatabaseLifecycleService implements OnModuleDestroy {
  constructor(@Inject(PLATFORM_DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
