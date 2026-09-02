import {
  DecryptCommand,
  GenerateDataKeyCommand,
  GenerateMacCommand,
  KMSClient,
} from '@aws-sdk/client-kms';

import type { AwsKmsClientPort } from './aws-kms-data-key.provider.js';

/**
 * AWS SDK binding kept behind the application-facing KMS port.
 * Constructing this adapter does not make a network request; the SDK call is
 * made only when one of the provider operations is invoked.
 */
export class AwsKmsClientAdapter implements AwsKmsClientPort {
  private readonly client: KMSClient;

  constructor(
    client: KMSClient = new KMSClient({
      region: process.env.AWS_REGION ?? 'us-west-2',
    }),
  ) {
    this.client = client;
  }

  async generateDataKey(input: {
    readonly encryptionContext: Readonly<Record<string, string>>;
    readonly keyId: string;
    readonly keySpec: 'AES_256';
  }): Promise<{
    readonly ciphertextBlob?: Uint8Array;
    readonly plaintext?: Uint8Array;
  }> {
    const result = await this.client.send(
      new GenerateDataKeyCommand({
        EncryptionContext: input.encryptionContext,
        KeyId: input.keyId,
        KeySpec: input.keySpec,
      }),
    );
    return {
      ...(result.CiphertextBlob === undefined
        ? {}
        : { ciphertextBlob: result.CiphertextBlob }),
      ...(result.Plaintext === undefined
        ? {}
        : { plaintext: result.Plaintext }),
    };
  }

  async decrypt(input: {
    readonly ciphertextBlob: Uint8Array;
    readonly encryptionContext: Readonly<Record<string, string>>;
    readonly keyId: string;
  }): Promise<{ readonly plaintext?: Uint8Array }> {
    const result = await this.client.send(
      new DecryptCommand({
        CiphertextBlob: input.ciphertextBlob,
        EncryptionContext: input.encryptionContext,
        KeyId: input.keyId,
      }),
    );
    return result.Plaintext === undefined
      ? {}
      : { plaintext: result.Plaintext };
  }

  async generateMac(input: {
    readonly keyId: string;
    readonly macAlgorithm: 'HMAC_SHA_256';
    readonly message: Uint8Array;
  }): Promise<{ readonly mac?: Uint8Array }> {
    const result = await this.client.send(
      new GenerateMacCommand({
        KeyId: input.keyId,
        MacAlgorithm: input.macAlgorithm,
        Message: input.message,
      }),
    );
    return result.Mac === undefined ? {} : { mac: result.Mac };
  }
}
