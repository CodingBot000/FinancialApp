import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const clean = process.argv.includes('--clean');
const environmentFile = path.resolve(
  process.env.COMPOSE_ENV_FILE ?? 'infra/docker/.env',
);
const compose = [
  'compose',
  '--env-file',
  environmentFile,
  '-f',
  'infra/docker/compose.yaml',
];

async function run(command, args, environment = process.env) {
  process.stdout.write(`\n[local-acceptance] ${command} ${args.join(' ')}\n`);
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: environment, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code}).`));
    });
  });
}

async function waitFor(url, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // A clean local stack needs a bounded startup interval.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local service did not become ready: ${url}`);
}

await fs.access(environmentFile);
if (clean) {
  await run('docker', [...compose, 'down', '--volumes', '--remove-orphans']);
}
await run('npm', ['ci']);
await run('node', [
  'scripts/run-with-local-docker.mjs',
  'npm',
  'run',
  'verify',
]);
await run('docker', [
  ...compose,
  'build',
  'platform-api',
  'institution-simulator',
]);
await run('docker', [...compose, 'up', '-d', 'postgres', 'keycloak']);
await run('docker', [
  ...compose,
  '--profile',
  'tools',
  'run',
  '--rm',
  'platform-migrate',
]);
await run('docker', [
  ...compose,
  '--profile',
  'tools',
  'run',
  '--rm',
  'simulator-migrate',
]);
await run('docker', [
  ...compose,
  '--profile',
  'tools',
  'run',
  '--rm',
  'simulator-seed',
]);
await run('docker', [
  ...compose,
  '--profile',
  'tools',
  'run',
  '--rm',
  'simulator-seed',
]);
await run('docker', [
  ...compose,
  'up',
  '-d',
  'platform-api',
  'institution-simulator',
]);
await Promise.all([
  waitFor('http://127.0.0.1:8081/api/v1/health'),
  waitFor('http://127.0.0.1:8082/sim/v1/health'),
  waitFor(
    'http://127.0.0.1:8083/realms/finapp/.well-known/openid-configuration',
  ),
]);
await run('npm', ['run', 'smoke:local-mvp'], {
  ...process.env,
  COMPOSE_ENV_FILE: environmentFile,
});
await run('node', ['scripts/verify-local-query-plans.mjs'], {
  ...process.env,
  COMPOSE_ENV_FILE: environmentFile,
});
await run('docker', [...compose, 'ps']);
await run('docker', [
  'run',
  '--rm',
  '--entrypoint',
  'npm',
  'finapp-platform-api:local',
  'audit',
  '--omit=dev',
  '--workspace',
  '@finapp/platform-api',
]);
await run('docker', [
  'run',
  '--rm',
  '--entrypoint',
  'npm',
  'finapp-institution-simulator:local',
  'audit',
  '--omit=dev',
  '--workspace',
  '@finapp/institution-simulator',
]);

process.stdout.write(
  `\n${JSON.stringify({ acceptance: 'passed', clean, remoteResourcesUsed: false, scenarioSteps: 12, syntheticData: true })}\n`,
);
