import type { DataKeyProvider } from '../../application/ports/data-key-provider.port.js';
import { AwsKmsDataKeyProvider } from './aws-kms-data-key.provider.js';
import { AwsKmsClientAdapter } from './aws-kms-client.adapter.js';
import { LocalDataKeyProvider } from './local-data-key.provider.js';

const AWS_KMS_PROFILES = new Set(['demo', 'production']);
const DEFAULT_AWS_KMS_KEY_VERSION = 'kms-v1';

export function createDataKeyProvider(): DataKeyProvider {
  const appEnvironment = process.env.APP_ENV ?? 'local';
  if (!AWS_KMS_PROFILES.has(appEnvironment)) {
    return new LocalDataKeyProvider();
  }

  return new AwsKmsDataKeyProvider(new AwsKmsClientAdapter(), {
    encryptionKeyId: requiredEnvironment('AWS_KMS_KEY_ARN'),
    hmacKeyId: requiredEnvironment('AWS_KMS_HMAC_KEY_ARN'),
    keyVersion:
      process.env.AWS_KMS_KEY_VERSION?.trim() || DEFAULT_AWS_KMS_KEY_VERSION,
  });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required for APP_ENV=${process.env.APP_ENV}.`);
  }
  return value;
}
