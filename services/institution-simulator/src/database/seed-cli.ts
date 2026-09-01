import { Pool } from 'pg';

import { AccountRepository } from '../modules/account/account.repository.js';

const connectionString = process.env.SIMULATOR_DATABASE_URL;

if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('SIMULATOR_DATABASE_URL is required.');
}

const pool = new Pool({ connectionString, max: 1 });

try {
  await new AccountRepository(pool).seedBalancedWorker();
} finally {
  await pool.end();
}
