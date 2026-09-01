import { readFile } from 'node:fs/promises';

import pg from 'pg';

const { Pool } = pg;
const envPath = process.env.COMPOSE_ENV_FILE ?? 'infra/docker/.env';

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

function visit(plan, result) {
  result.nodeTypes.add(plan['Node Type']);
  if (typeof plan['Index Name'] === 'string') {
    result.indexes.add(plan['Index Name']);
  }
  for (const child of plan.Plans ?? []) visit(child, result);
}

const fileEnv = parseEnv(await readFile(envPath, 'utf8'));
const password =
  process.env.FINAPP_PLATFORM_DB_PASSWORD ??
  fileEnv.FINAPP_PLATFORM_DB_PASSWORD;
if (!password) throw new Error('FINAPP_PLATFORM_DB_PASSWORD is required.');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'financial_app',
  user: 'financial_platform_app',
  password,
  max: 1,
});

try {
  const identity = await pool.query(`
    SELECT h.user_id, h.account_id
    FROM finapp_wealth.finapp_holding h
    LIMIT 1
  `);
  const userId = identity.rows[0]?.user_id;
  const accountId = identity.rows[0]?.account_id;
  if (typeof userId !== 'string' || typeof accountId !== 'string') {
    throw new Error('Local synthetic wealth data is required.');
  }

  const cases = [
    {
      name: 'latest-asset-snapshots',
      expectedIndexes: ['finapp_idx_asset_snapshot_user_date'],
      parameters: [userId],
      query: `
        SELECT id, as_of_date, total_assets
        FROM finapp_wealth.finapp_asset_snapshot
        WHERE user_id = $1
        ORDER BY as_of_date DESC
        LIMIT 2
      `,
    },
    {
      name: 'account-holdings',
      expectedIndexes: [
        'finapp_idx_holding_user_account',
        'finapp_uq_holding_account_instrument',
      ],
      parameters: [userId, accountId],
      query: `
        SELECT h.id, h.account_id, h.quantity, i.instrument_code
        FROM finapp_wealth.finapp_holding h
        JOIN finapp_wealth.finapp_instrument i ON i.id = h.instrument_id
        WHERE h.user_id = $1 AND h.account_id = $2
        ORDER BY i.instrument_code
      `,
    },
    {
      name: 'owner-order-page',
      expectedIndexes: ['finapp_idx_order_user_created'],
      parameters: [userId],
      query: `
        SELECT o.id, o.status, e.amount
        FROM finapp_trading.finapp_trade_order o
        LEFT JOIN finapp_trading.finapp_order_execution e ON e.order_id = o.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 21
      `,
    },
    {
      name: 'reconciliation-claim',
      expectedIndexes: ['finapp_idx_reconcile_claim'],
      parameters: [],
      query: `
        SELECT id, status, next_attempt_at
        FROM finapp_trading.finapp_reconciliation_job
        WHERE status IN ('QUEUED', 'RETRY') AND next_attempt_at <= now()
        ORDER BY next_attempt_at, created_at
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      `,
    },
  ];

  const evidence = [];
  for (const item of cases) {
    const response = await pool.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${item.query}`,
      item.parameters,
    );
    const document = response.rows[0]?.['QUERY PLAN'];
    const root = Array.isArray(document) ? document[0] : undefined;
    if (!root?.Plan) throw new Error(`Plan ${item.name} is unavailable.`);
    const details = { indexes: new Set(), nodeTypes: new Set() };
    visit(root.Plan, details);
    if (!item.expectedIndexes.some((index) => details.indexes.has(index))) {
      throw new Error(
        `Plan ${item.name} missed expected index (${[...details.indexes].join(', ')}).`,
      );
    }
    if (root['Execution Time'] > 100) {
      throw new Error(`Plan ${item.name} exceeded the local 100ms ceiling.`);
    }
    evidence.push({
      name: item.name,
      executionTimeMs: root['Execution Time'],
      indexes: [...details.indexes].sort(),
      nodeTypes: [...details.nodeTypes].sort(),
      sharedHitBlocks: root.Plan['Shared Hit Blocks'] ?? 0,
    });
  }

  process.stdout.write(
    `${JSON.stringify({ plans: evidence, remoteResourcesUsed: false })}\n`,
  );
} finally {
  await pool.end();
}
