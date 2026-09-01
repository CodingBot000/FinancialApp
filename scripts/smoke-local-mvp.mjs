import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const environmentFile = path.resolve(
  process.env.COMPOSE_ENV_FILE ?? 'infra/docker/.env',
);

function parseEnvironment(value) {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 1) throw new Error(`Invalid env line: ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function run(command, args, environment) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: environment,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code}).`));
    });
  });
}

const localEnvironment = parseEnvironment(
  await fs.readFile(environmentFile, 'utf8'),
);
const required = [
  'FINAPP_KEYCLOAK_ADMIN_PASSWORD',
  'FINAPP_PLATFORM_DB_PASSWORD',
  'FINAPP_MYDATA_ENCRYPTION_KEY_BASE64',
];
for (const name of required) {
  if (!localEnvironment[name]) {
    throw new Error(`${name} is required in ${environmentFile}.`);
  }
}

const password = `${randomBytes(24).toString('base64url')}aA1!`;
const environment = {
  ...process.env,
  ...localEnvironment,
  COMPOSE_ENV_FILE: environmentFile,
  FINAPP_LOCAL_OIDC_TEST_PASSWORD: password,
};

await run('npm', ['run', 'oidc:local:user'], environment);
await run('npm', ['run', 'smoke:local-oidc'], environment);
await run('npm', ['run', 'smoke:local-order'], environment);
process.stdout.write(
  `${JSON.stringify({ localMvpSmoke: 'passed', remoteResourcesUsed: false, syntheticData: true })}\n`,
);
