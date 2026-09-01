import type {
  DataKeyContext,
  DataKeyProvider,
  GeneratedDataKey,
} from '../../application/ports/data-key-provider.port.js';

export interface AwsKmsClientPort {
  generateDataKey(input: {
    readonly encryptionContext: Readonly<Record<string, string>>;
    readonly keyId: string;
    readonly keySpec: 'AES_256';
  }): Promise<{
    readonly ciphertextBlob?: Uint8Array;
    readonly plaintext?: Uint8Array;
  }>;
  decrypt(input: {
    readonly ciphertextBlob: Uint8Array;
    readonly encryptionContext: Readonly<Record<string, string>>;
    readonly keyId: string;
  }): Promise<{ readonly plaintext?: Uint8Array }>;
  generateMac(input: {
    readonly keyId: string;
    readonly macAlgorithm: 'HMAC_SHA_256';
    readonly message: Uint8Array;
  }): Promise<{ readonly mac?: Uint8Array }>;
}

export interface AwsKmsDataKeyProviderConfig {
  readonly encryptionKeyId: string;
  readonly hmacKeyId: string;
  readonly keyVersion: string;
}

export class AwsKmsDataKeyProvider implements DataKeyProvider {
  constructor(
    private readonly client: AwsKmsClientPort,
    private readonly config: AwsKmsDataKeyProviderConfig,
  ) {}

  async generateDataKey(context: DataKeyContext): Promise<GeneratedDataKey> {
    const result = await this.client.generateDataKey({
      keyId: this.config.encryptionKeyId,
      keySpec: 'AES_256',
      encryptionContext: this.encryptionContext(context),
    });
    const plaintextKey = Buffer.from(result.plaintext ?? []);
    const encryptedDataKey = Buffer.from(result.ciphertextBlob ?? []);
    if (plaintextKey.length !== 32 || encryptedDataKey.length === 0) {
      plaintextKey.fill(0);
      throw new Error('AWS KMS did not return a valid data key.');
    }
    return {
      plaintextKey,
      encryptedDataKey,
      keyVersion: this.config.keyVersion,
    };
  }

  async decryptDataKey(
    encryptedDataKey: Buffer,
    keyVersion: string,
    context: DataKeyContext,
  ): Promise<Buffer> {
    if (
      keyVersion !== this.config.keyVersion ||
      encryptedDataKey.length === 0
    ) {
      throw new Error('AWS KMS data key metadata is invalid.');
    }
    const result = await this.client.decrypt({
      ciphertextBlob: encryptedDataKey,
      keyId: this.config.encryptionKeyId,
      encryptionContext: this.encryptionContext(context),
    });
    const plaintextKey = Buffer.from(result.plaintext ?? []);
    if (plaintextKey.length !== 32) {
      plaintextKey.fill(0);
      throw new Error('AWS KMS did not decrypt a valid data key.');
    }
    return plaintextKey;
  }

  async lookupHash(value: string, context: DataKeyContext): Promise<string> {
    const message = Buffer.from(
      `${JSON.stringify(this.encryptionContext(context))}|${value}`,
      'utf8',
    );
    const result = await this.client.generateMac({
      keyId: this.config.hmacKeyId,
      macAlgorithm: 'HMAC_SHA_256',
      message,
    });
    const mac = Buffer.from(result.mac ?? []);
    if (mac.length !== 32)
      throw new Error('AWS KMS did not return a valid MAC.');
    return mac.toString('hex');
  }

  private encryptionContext(
    context: DataKeyContext,
  ): Readonly<Record<string, string>> {
    return {
      application: context.application,
      column: context.column,
      schema: context.schema,
      scopeId: context.scopeId,
      scopeType: context.scopeType,
      table: context.table,
    };
  }
}
