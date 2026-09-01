import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete']);

async function readYaml(relativePath) {
  return YAML.parse(
    await fs.readFile(path.join(repositoryRoot, relativePath), 'utf8'),
  );
}

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(path.join(repositoryRoot, relativePath), 'utf8'),
  );
}

function localReference(document, reference) {
  if (!reference.startsWith('#/')) {
    throw new Error(
      `Only local OpenAPI references are supported: ${reference}`,
    );
  }
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => {
      if (value === null || typeof value !== 'object' || !(part in value)) {
        throw new Error(`OpenAPI reference does not exist: ${reference}`);
      }
      return value[part];
    }, document);
}

function dereference(value, document) {
  if (Array.isArray(value)) {
    return value.map((item) => dereference(item, document));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (typeof value.$ref === 'string') {
    return dereference(localReference(document, value.$ref), document);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      dereference(item, document),
    ]),
  );
}

function operations(document) {
  const result = new Map();
  for (const [routePath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!httpMethods.has(method)) continue;
      if (typeof operation.operationId !== 'string') {
        throw new Error(
          `${method.toUpperCase()} ${routePath} has no operationId`,
        );
      }
      if (result.has(operation.operationId)) {
        throw new Error(`Duplicate operationId: ${operation.operationId}`);
      }
      result.set(operation.operationId, {
        method: method.toUpperCase(),
        operation,
        path: routePath,
      });
    }
  }
  return result;
}

function responseSchema(document, operationId, operation, status) {
  const responseReference = operation.responses?.[String(status)];
  if (responseReference === undefined) {
    throw new Error(`${operationId} does not declare response ${status}`);
  }
  const response = dereference(responseReference, document);
  const schema =
    response.content?.['application/json']?.schema ??
    response.content?.['application/problem+json']?.schema;
  if (schema === undefined) {
    throw new Error(`${operationId} response ${status} has no JSON schema`);
  }
  return dereference(schema, document);
}

function normalizeRoute(prefix, suffix) {
  return `/${[prefix, suffix]
    .map((value) => value.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')}`.replaceAll(/:([A-Za-z0-9_]+)/g, '{$1}');
}

async function controllerRoutes(relativeFile) {
  const source = await fs.readFile(
    path.join(repositoryRoot, relativeFile),
    'utf8',
  );
  const controller = source.match(/@Controller\(\s*['"`]([^'"`]*)['"`]\s*\)/);
  if (controller === null) return [];

  const routes = [];
  let pending;
  for (const line of source.split('\n')) {
    const decorator = line.match(
      /^\s*@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/,
    );
    if (decorator !== null) {
      pending = {
        method: decorator[1].toUpperCase(),
        path: normalizeRoute(controller[1], decorator[2] ?? ''),
      };
      continue;
    }
    if (pending === undefined || /^\s*@/.test(line)) continue;
    const handler = line.match(/^\s*(?:async\s+)?([A-Za-z][A-Za-z0-9_]*)\s*\(/);
    if (handler !== null) {
      routes.push({ ...pending, handler: handler[1], file: relativeFile });
      pending = undefined;
    }
  }
  return routes;
}

async function controllerFiles(relativeRoot) {
  const result = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.name.endsWith('.controller.ts')) {
        result.push(path.relative(repositoryRoot, absolute));
      }
    }
  }
  await walk(path.join(repositoryRoot, relativeRoot));
  return result.sort();
}

function assertSameSet(actual, expected, message) {
  const missing = [...expected].filter((item) => !actual.has(item));
  const unexpected = [...actual].filter((item) => !expected.has(item));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${message}; missing=[${missing.join(', ')}], unexpected=[${unexpected.join(', ')}]`,
    );
  }
}

const coverage = await readYaml('contracts/operation-coverage.yaml');
const baseline = await readYaml(
  'contracts/openapi/compatibility-baseline.yaml',
);
const fixtureRegistry = await readJson(coverage.fixtureRegistry);
const fixturesByContract = Map.groupBy(
  fixtureRegistry,
  (fixture) => fixture.contract,
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
let operationCount = 0;
let fixtureCount = 0;

for (const [contractId, contractCoverage] of Object.entries(
  coverage.contracts,
)) {
  const document = await readYaml(contractCoverage.openapi);
  const currentOperations = operations(document);
  assertSameSet(
    new Set(Object.keys(contractCoverage.operations)),
    new Set(currentOperations.keys()),
    `${contractId} operation coverage is incomplete`,
  );

  const discoveredRoutes = [];
  for (const root of contractCoverage.controllerRoots) {
    for (const file of await controllerFiles(root)) {
      discoveredRoutes.push(...(await controllerRoutes(file)));
    }
  }
  assertSameSet(
    new Set(discoveredRoutes.map((route) => `${route.method} ${route.path}`)),
    new Set(
      [...currentOperations.values()].map(
        (operation) => `${operation.method} ${operation.path}`,
      ),
    ),
    `${contractId} controller routes differ from canonical OpenAPI`,
  );

  for (const [operationId, tracked] of Object.entries(
    contractCoverage.operations,
  )) {
    const current = currentOperations.get(operationId);
    const [implementationFile, handler] = tracked.implementation;
    const implementedRoute = discoveredRoutes.find(
      (route) => route.file === implementationFile && route.handler === handler,
    );
    if (implementedRoute === undefined) {
      throw new Error(
        `${operationId} implementation ${implementationFile}#${handler} was not found`,
      );
    }
    if (
      implementedRoute.method !== current.method ||
      implementedRoute.path !== current.path
    ) {
      throw new Error(`${operationId} controller route differs from OpenAPI`);
    }

    if (
      !Array.isArray(tracked.providerTests) ||
      tracked.providerTests.length === 0
    ) {
      throw new Error(`${operationId} has no provider test`);
    }
    for (const providerTest of tracked.providerTests) {
      const source = await fs.readFile(
        path.join(repositoryRoot, providerTest),
        'utf8',
      );
      if (!source.includes(operationId)) {
        throw new Error(`${providerTest} does not trace ${operationId}`);
      }
    }

    const consumer = tracked.consumer;
    if (consumer.status === 'implemented') {
      if (typeof consumer.adapter !== 'string') {
        throw new Error(`${operationId} implemented consumer has no adapter`);
      }
      await fs.access(path.join(repositoryRoot, consumer.adapter));
    } else if (!['planned', 'not-applicable'].includes(consumer.status)) {
      throw new Error(`${operationId} has invalid consumer status`);
    }
    if (typeof consumer.target !== 'string' || consumer.target.length === 0) {
      throw new Error(`${operationId} consumer target is missing`);
    }

    for (const status of Object.keys(current.operation.responses ?? {})) {
      responseSchema(document, operationId, current.operation, status);
    }
    const successFixtures = (fixturesByContract.get(contractId) ?? []).filter(
      (fixture) =>
        fixture.operationId === operationId &&
        fixture.status >= 200 &&
        fixture.status < 300,
    );
    if (successFixtures.length === 0) {
      throw new Error(`${operationId} has no consumer success fixture`);
    }
    operationCount += 1;
  }

  for (const fixture of fixturesByContract.get(contractId) ?? []) {
    const current = currentOperations.get(fixture.operationId);
    if (current === undefined) {
      throw new Error(
        `Fixture references unknown ${contractId} operation ${fixture.operationId}`,
      );
    }
    const validate = ajv.compile(
      responseSchema(
        document,
        fixture.operationId,
        current.operation,
        fixture.status,
      ),
    );
    if (!validate(fixture.body)) {
      throw new Error(
        `${contractId}:${fixture.operationId}:${fixture.status} fixture violates OpenAPI: ${ajv.errorsText(validate.errors)}`,
      );
    }
    fixtureCount += 1;
  }

  const contractBaseline = baseline.contracts[contractId];
  if (contractBaseline === undefined) {
    throw new Error(`${contractId} has no compatibility baseline`);
  }
  for (const [operationId, oldOperation] of Object.entries(
    contractBaseline.operations,
  )) {
    const current = currentOperations.get(operationId);
    if (current === undefined) {
      throw new Error(`Compatibility break: removed operation ${operationId}`);
    }
    if (
      current.method !== oldOperation.method ||
      current.path !== oldOperation.path
    ) {
      throw new Error(`Compatibility break: moved operation ${operationId}`);
    }
    const statuses = new Set(
      Object.keys(current.operation.responses).map(Number),
    );
    for (const status of oldOperation.statuses) {
      if (!statuses.has(status)) {
        throw new Error(
          `Compatibility break: removed ${operationId} response ${status}`,
        );
      }
    }
  }
  for (const [schemaName, oldSchema] of Object.entries(
    contractBaseline.schemas,
  )) {
    const currentSchema = document.components?.schemas?.[schemaName];
    if (currentSchema === undefined) {
      throw new Error(`Compatibility break: removed schema ${schemaName}`);
    }
    if (JSON.stringify(currentSchema.type) !== JSON.stringify(oldSchema.type)) {
      throw new Error(`Compatibility break: changed ${schemaName} type`);
    }
    for (const property of oldSchema.properties ?? []) {
      if (!(property in (currentSchema.properties ?? {}))) {
        throw new Error(
          `Compatibility break: removed ${schemaName}.${property}`,
        );
      }
    }
  }
}

const legacyHealthFixture = await readJson(
  'apps/mobile/src/shared/api/mock/fixtures/platform-health.success.json',
);
const platformDocument = await readYaml(
  coverage.contracts['platform-v1'].openapi,
);
const platformHealth = operations(platformDocument).get('getPlatformHealth');
const validateLegacyHealth = ajv.compile(
  responseSchema(
    platformDocument,
    'getPlatformHealth',
    platformHealth.operation,
    200,
  ),
);
if (!validateLegacyHealth(legacyHealthFixture)) {
  throw new Error(
    `Mobile health fixture violates OpenAPI: ${ajv.errorsText(validateLegacyHealth.errors)}`,
  );
}

process.stdout.write(
  `Validated ${operationCount} operations, ${fixtureCount + 1} fixtures, controller coverage, provider traces, consumer status, and compatibility baselines.\n`,
);
