import fs from 'node:fs/promises';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const checks = [
  {
    contract: new URL('../contracts/openapi/platform-v1.yaml', import.meta.url),
    fixture: new URL(
      '../apps/mobile/src/shared/api/mock/fixtures/platform-health.success.json',
      import.meta.url,
    ),
    schemaName: 'HealthResponse',
  },
];

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

for (const check of checks) {
  const contract = YAML.parse(await fs.readFile(check.contract, 'utf8'));
  const fixture = JSON.parse(await fs.readFile(check.fixture, 'utf8'));
  const schema = contract.components?.schemas?.[check.schemaName];

  if (schema === undefined) {
    throw new Error(
      `Missing schema ${check.schemaName} in ${check.contract.pathname}`,
    );
  }

  const validate = ajv.compile(schema);
  if (!validate(fixture)) {
    throw new Error(
      `Fixture ${check.fixture.pathname} violates ${check.schemaName}: ${ajv.errorsText(validate.errors)}`,
    );
  }
}

process.stdout.write(`Validated ${checks.length} contract fixture(s).\n`);
