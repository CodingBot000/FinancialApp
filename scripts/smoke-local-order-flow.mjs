import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const platformBase = 'http://127.0.0.1:18081';
const issuer = 'http://127.0.0.1:18080/realms/finapp';
const platformPassword = process.env.FINAPP_PLATFORM_DB_PASSWORD;
const encryptionKey = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64;
if (!platformPassword || !encryptionKey) {
  throw new Error('Local Compose example environment is required.');
}
const platformDatabaseUrl = `postgresql://financial_platform_app:${encodeURIComponent(platformPassword)}@127.0.0.1:5433/financial_app`;
const keyPair = await generateKeyPair('RS256');
const publicJwk = await exportJWK(keyPair.publicKey);
Object.assign(publicJwk, { alg: 'RS256', kid: 'local-smoke', use: 'sig' });

const jwks = createServer((request, response) => {
  if (request.url !== '/jwks') return void response.writeHead(404).end();
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ keys: [publicJwk] }));
});
await new Promise((resolve) => jwks.listen(18080, '127.0.0.1', resolve));

const platform = spawn('node', ['services/platform-api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    APP_ENV: 'local',
    FINAPP_DATASET_VERSION: 'FINANCIAL_APP_DATASET_V1',
    FINAPP_MYDATA_ENCRYPTION_KEY_BASE64: encryptionKey,
    FINAPP_MYDATA_ENCRYPTION_KEY_VERSION: 'local-v1',
    INSTITUTION_SIMULATOR_BASE_URL: 'http://127.0.0.1:8082',
    INSTITUTION_SIMULATOR_TIMEOUT_MS: '1000',
    MYDATA_SCHEDULER_ENABLED: 'false',
    OIDC_AUDIENCE: 'finapp-platform-api',
    OIDC_ISSUER: issuer,
    OIDC_JWKS_URI: 'http://127.0.0.1:18080/jwks',
    ORDER_RECONCILIATION_BACKOFF_MS: '50',
    ORDER_RECONCILIATION_ENABLED: 'true',
    ORDER_RECONCILIATION_TICK_MS: '50',
    PLATFORM_API_PORT: '18081',
    PLATFORM_DATABASE_URL: platformDatabaseUrl,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
platform.stdout.on('data', (chunk) => (output += chunk.toString()));
platform.stderr.on('data', (chunk) => (output += chunk.toString()));

async function waitFor(test, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const value = await test();
      if (value) return value;
    } catch {
      // The bounded loop waits for local startup/state convergence.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Local smoke timed out.\n${output}`);
}

const token = await new SignJWT({
  scope:
    'financial.read financial.write simulation.execute order.execute scenario.admin',
})
  .setProtectedHeader({ alg: 'RS256', kid: 'local-smoke' })
  .setIssuer(issuer)
  .setSubject('local-smoke-user')
  .setAudience('finapp-platform-api')
  .setIssuedAt()
  .setExpirationTime('10m')
  .sign(keyPair.privateKey);
const headers = {
  authorization: `Bearer ${token}`,
};

async function request(path, init = {}, expected = 200) {
  const response = await fetch(`${platformBase}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.body === undefined
        ? {}
        : { 'content-type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json();
  if (response.status !== expected) {
    throw new Error(
      `${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function setScenario(mode) {
  return request(
    '/api/v1/dev/scenario',
    { method: 'PUT', body: JSON.stringify({ mode }) },
    200,
  );
}

async function createOrder(accountId, instrumentId, expectedStatus) {
  const quote = await request(
    '/api/v1/orders/preview',
    {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        instrumentId,
        side: 'BUY',
        quantity: '1.00000000',
      }),
    },
    201,
  );
  const expectedHttp = expectedStatus === 'UNKNOWN' ? 202 : 201;
  const order = await request(
    '/api/v1/orders',
    {
      method: 'POST',
      headers: {
        'idempotency-key': randomUUID(),
      },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        accountId,
        instrumentId,
        side: 'BUY',
        quantity: '1.00000000',
      }),
    },
    expectedHttp,
  );
  if (order.status !== expectedStatus)
    throw new Error(`Expected ${expectedStatus}`);
  return order;
}

try {
  await waitFor(async () => (await fetch(`${platformBase}/api/v1/health`)).ok);
  const existingConnections = await request('/api/v1/mydata/connections');
  const connection =
    existingConnections[0] ??
    (await request(
      '/api/v1/mydata/connections',
      {
        method: 'POST',
        body: JSON.stringify({
          institutionCode: 'SYNTH_WEALTH_001',
          consentExpiresAt: '2027-09-01T00:00:00.000Z',
        }),
      },
      201,
    ));
  const sync = await request(
    '/api/v1/mydata/syncs',
    {
      method: 'POST',
      body: JSON.stringify({ connectionId: connection.connectionId }),
    },
    202,
  );
  await waitFor(async () => {
    const current = await request(`/api/v1/mydata/syncs/${sync.syncId}`);
    return current.status === 'COMPLETED' ? current : undefined;
  });
  const connections = await request('/api/v1/mydata/connections');
  const summary = await request('/api/v1/assets/summary');
  const accounts = await request('/api/v1/accounts');
  const holdings = await request('/api/v1/holdings');
  const transactions = await request('/api/v1/transactions');
  const history = await request('/api/v1/assets/history?range=1Y');
  const simulation = await request(
    '/api/v1/simulations',
    {
      method: 'POST',
      body: JSON.stringify({
        allocation: [
          { assetClass: 'CASH', weight: 0.1 },
          { assetClass: 'BOND', weight: 0.3 },
          { assetClass: 'EQUITY', weight: 0.6 },
        ],
        durationMonths: 12,
        initialAssets: '185400000.0000',
        monthlyContribution: '1500000.0000',
        targetAmount: '220000000.0000',
      }),
    },
    201,
  );
  const persistedSimulation = await request(
    `/api/v1/simulations/${simulation.simulationId}`,
  );
  const accountId = accounts.items[0]?.accountId;
  const holdingId = holdings.items[0]?.holdingId;
  const resource = await fetch(`${platformBase}/api/v1/accounts/${accountId}`, {
    headers,
  });
  if (
    !resource.ok ||
    !accountId ||
    !holdingId ||
    connections.length !== 1 ||
    summary.currency !== 'KRW' ||
    transactions.items.length === 0 ||
    history.points.length === 0 ||
    persistedSimulation.engineVersion !== '1.0.0' ||
    persistedSimulation.assumptionSetVersion !== 'SYNTHETIC_V1' ||
    persistedSimulation.series.length !== 13
  )
    throw new Error('Synced resources missing.');
  const database = await import('pg');
  const pool = new database.Pool({
    connectionString: platformDatabaseUrl,
  });
  const instruments = await pool.query(
    'SELECT instrument_id FROM finapp_wealth.finapp_holding WHERE id = $1',
    [holdingId],
  );
  await pool.end();
  const instrumentId = instruments.rows[0]?.instrument_id;
  if (!instrumentId) throw new Error('Instrument missing.');

  await setScenario('NORMAL');
  await createOrder(accountId, instrumentId, 'FILLED');
  await setScenario('ORDER_REJECT');
  await createOrder(accountId, instrumentId, 'REJECTED');
  await setScenario('ORDER_UNKNOWN_THEN_FILLED');
  const unknown = await createOrder(accountId, instrumentId, 'UNKNOWN');
  const reconciled = await waitFor(async () => {
    const current = await request(`/api/v1/orders/${unknown.orderId}`);
    return current.status === 'FILLED' ? current : undefined;
  });
  await request('/api/v1/dev/dataset/reset', { method: 'POST' }, 200);
  process.stdout.write(
    `${JSON.stringify({ accounts: accounts.items.length, historyPoints: history.points.length, normal: 'FILLED', rejected: 'REJECTED', reconciled: reconciled.status, simulationPoints: persistedSimulation.series.length, syntheticData: true, transactions: transactions.items.length })}\n`,
  );
} finally {
  platform.kill('SIGTERM');
  await new Promise((resolve) => platform.once('exit', resolve));
  await new Promise((resolve) => jwks.close(resolve));
}
