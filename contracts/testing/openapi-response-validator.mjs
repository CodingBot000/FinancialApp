import fs from 'node:fs/promises';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

function jsonPointer(root, pointer) {
  if (!pointer.startsWith('#/')) {
    throw new Error(`Only local OpenAPI references are supported: ${pointer}`);
  }
  return pointer
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => {
      if (value === null || typeof value !== 'object' || !(part in value)) {
        throw new Error(`OpenAPI reference does not exist: ${pointer}`);
      }
      return value[part];
    }, root);
}

function dereference(value, root) {
  if (Array.isArray(value)) {
    return value.map((item) => dereference(item, root));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (typeof value.$ref === 'string') {
    return dereference(jsonPointer(root, value.$ref), root);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, dereference(item, root)]),
  );
}

export async function createOpenApiResponseValidator(contractUrl) {
  const document = YAML.parse(await fs.readFile(contractUrl, 'utf8'));
  const operations = new Map();
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(pathItem)) {
      if (operation.operationId !== undefined) {
        operations.set(operation.operationId, operation);
      }
    }
  }

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validators = new Map();
  return {
    validate(operationId, status, body) {
      const operation = operations.get(operationId);
      if (operation === undefined) {
        throw new Error(`Unknown OpenAPI operationId: ${operationId}`);
      }
      const responseReference = operation.responses?.[String(status)];
      if (responseReference === undefined) {
        throw new Error(
          `OpenAPI operation ${operationId} does not declare response ${status}`,
        );
      }
      const response = dereference(responseReference, document);
      const schema =
        response.content?.['application/json']?.schema ??
        response.content?.['application/problem+json']?.schema;
      if (schema === undefined) {
        throw new Error(
          `OpenAPI operation ${operationId} response ${status} has no JSON schema`,
        );
      }

      const key = `${operationId}:${status}`;
      const validate =
        validators.get(key) ?? ajv.compile(dereference(schema, document));
      validators.set(key, validate);
      if (!validate(body)) {
        throw new Error(
          `${key} response violates OpenAPI: ${ajv.errorsText(validate.errors)}`,
        );
      }
    },
  };
}
