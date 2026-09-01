import { createCipheriv, createHash, randomBytes } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AesSensitiveDataAdapter } from '../../src/modules/mydata/infrastructure/crypto/aes-sensitive-data.adapter.js';
import {
  AwsKmsDataKeyProvider,
  type AwsKmsClientPort,
} from '../../src/modules/mydata/infrastructure/crypto/aws-kms-data-key.provider.js';
import { LocalDataKeyProvider } from '../../src/modules/mydata/infrastructure/crypto/local-data-key.provider.js';

const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const localKey = Buffer.alloc(32, 9);

describe('DataKeyProvider envelope encryption', () => {
  const previous = {
    appEnvironment: process.env.APP_ENV,
    key: process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64,
    version: process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION,
  };

  beforeEach(() => {
    process.env.APP_ENV = 'test';
    process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64 =
      localKey.toString('base64');
    process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION = 'test-v2';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restore('APP_ENV', previous.appEnvironment);
    restore('FINAPP_MYDATA_ENCRYPTION_KEY_BASE64', previous.key);
    restore('FINAPP_MYDATA_ENCRYPTION_KEY_VERSION', previous.version);
  });

  it('roundtrips a versioned envelope and rejects wrong owner AAD or tampering', async () => {
    const crypto = new AesSensitiveDataAdapter(new LocalDataKeyProvider());
    const encrypted = await crypto.encrypt('SYNTH-CUSTOMER-A', ownerA);

    expect(encrypted.ciphertext.subarray(0, 4).toString('ascii')).toBe('FAE2');
    expect(encrypted.ciphertext.toString('utf8')).not.toContain(
      'SYNTH-CUSTOMER-A',
    );
    await expect(
      crypto.decrypt(encrypted.ciphertext, encrypted.keyVersion, ownerA),
    ).resolves.toBe('SYNTH-CUSTOMER-A');
    await expect(
      crypto.decrypt(encrypted.ciphertext, encrypted.keyVersion, ownerB),
    ).rejects.toThrow('cannot be decrypted');
    await expect(
      crypto.decrypt(encrypted.ciphertext, 'wrong-version', ownerA),
    ).rejects.toThrow('cannot be decrypted');

    const tampered = Buffer.from(encrypted.ciphertext);
    tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 1;
    await expect(
      crypto.decrypt(tampered, encrypted.keyVersion, ownerA),
    ).rejects.toThrow('cannot be decrypted');
  });

  it('keeps a local-only read path for pre-envelope synthetic ciphertext', async () => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', localKey, iv);
    const encrypted = Buffer.concat([
      cipher.update('SYNTH-LEGACY', 'utf8'),
      cipher.final(),
    ]);
    const legacy = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    const crypto = new AesSensitiveDataAdapter(new LocalDataKeyProvider());

    await expect(crypto.decrypt(legacy, 'test-v2', ownerA)).resolves.toBe(
      'SYNTH-LEGACY',
    );
    process.env.APP_ENV = 'production';
    await expect(crypto.decrypt(legacy, 'test-v2', ownerA)).rejects.toThrow(
      'prohibited',
    );
  });

  it('fails closed instead of using the local provider in demo or production', async () => {
    process.env.APP_ENV = 'demo';
    const provider = new LocalDataKeyProvider();

    await expect(
      provider.generateDataKey({
        application: 'financial-app',
        schema: 'finapp_mydata',
        table: 'finapp_institution_connection',
        column: 'external_customer_id_ciphertext',
        scopeType: 'USER',
        scopeId: ownerA,
      }),
    ).rejects.toThrow('prohibited');
  });

  it('maps the AWS KMS boundary with encryption context and no remote call', async () => {
    const dataKey = Buffer.alloc(32, 4);
    let generatedContext = '';
    const client: AwsKmsClientPort = {
      generateDataKey: vi.fn().mockImplementation(async (input) => {
        generatedContext = JSON.stringify(input.encryptionContext);
        return {
          plaintext: dataKey,
          ciphertextBlob: Buffer.from(generatedContext, 'utf8'),
        };
      }),
      decrypt: vi.fn().mockImplementation(async (input) => {
        if (
          input.ciphertextBlob.toString() !==
          JSON.stringify(input.encryptionContext)
        ) {
          throw new Error('KMS InvalidCiphertextException');
        }
        return { plaintext: dataKey };
      }),
      generateMac: vi.fn().mockImplementation(async (input) => ({
        mac: createHash('sha256').update(input.message).digest(),
      })),
    };
    const provider = new AwsKmsDataKeyProvider(client, {
      encryptionKeyId: 'kms-encryption-key-placeholder',
      hmacKeyId: 'kms-hmac-key-placeholder',
      keyVersion: 'kms-v1',
    });
    const crypto = new AesSensitiveDataAdapter(provider);
    const encrypted = await crypto.encrypt('SYNTH-CUSTOMER-A', ownerA);

    await expect(
      crypto.decrypt(encrypted.ciphertext, encrypted.keyVersion, ownerA),
    ).resolves.toBe('SYNTH-CUSTOMER-A');
    await expect(
      crypto.decrypt(encrypted.ciphertext, encrypted.keyVersion, ownerB),
    ).rejects.toThrow('cannot be decrypted');
    expect(client.generateDataKey).toHaveBeenCalledWith(
      expect.objectContaining({
        keySpec: 'AES_256',
        encryptionContext: expect.objectContaining({
          application: 'financial-app',
          scopeId: ownerA,
          table: 'finapp_institution_connection',
        }),
      }),
    );
    await expect(
      provider.lookupHash('SYNTH-CUSTOMER-A', {
        application: 'financial-app',
        schema: 'finapp_mydata',
        table: 'finapp_institution_connection',
        column: 'external_customer_id_ciphertext',
        scopeType: 'USER',
        scopeId: ownerA,
      }),
    ).resolves.toMatch(/^[0-9a-f]{64}$/);
    expect(client.generateMac).toHaveBeenCalledOnce();
  });
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
