import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';

import type {
  DataKeyContext,
  DataKeyProvider,
  GeneratedDataKey,
} from '../../application/ports/data-key-provider.port.js';
import { serializeDataKeyContext } from './data-key-context.js';

const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class LocalDataKeyProvider
  implements DataKeyProvider, OnApplicationBootstrap
{
  onApplicationBootstrap(): void {
    this.assertAllowedProfile();
  }

  async generateDataKey(context: DataKeyContext): Promise<GeneratedDataKey> {
    const { key, version } = this.loadWrappingKey();
    const plaintextKey = randomBytes(32);
    return {
      plaintextKey,
      encryptedDataKey: this.wrap(plaintextKey, key, context),
      keyVersion: version,
    };
  }

  async decryptDataKey(
    encryptedDataKey: Buffer,
    keyVersion: string,
    context: DataKeyContext,
  ): Promise<Buffer> {
    const { key, version } = this.loadWrappingKey();
    if (
      keyVersion !== version ||
      encryptedDataKey.length !== IV_BYTES + TAG_BYTES + 32
    ) {
      throw new Error('Encrypted data key cannot be decrypted.');
    }
    const iv = encryptedDataKey.subarray(0, IV_BYTES);
    const tag = encryptedDataKey.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const encrypted = encryptedDataKey.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(serializeDataKeyContext(context));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async lookupHash(value: string, context: DataKeyContext): Promise<string> {
    const { key } = this.loadWrappingKey();
    return createHmac('sha256', key)
      .update('finapp-lookup-v1|', 'utf8')
      .update(serializeDataKeyContext(context))
      .update('|', 'utf8')
      .update(value, 'utf8')
      .digest('hex');
  }

  private wrap(
    plaintextKey: Buffer,
    wrappingKey: Buffer,
    context: DataKeyContext,
  ): Buffer {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', wrappingKey, iv);
    cipher.setAAD(serializeDataKeyContext(context));
    const encrypted = Buffer.concat([
      cipher.update(plaintextKey),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  }

  private loadWrappingKey(): {
    readonly key: Buffer;
    readonly version: string;
  } {
    this.assertAllowedProfile();
    const encoded = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64;
    const version = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION;
    if (encoded === undefined || version === undefined) {
      throw new Error('MyData encryption key configuration is required.');
    }
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32 || version.length === 0 || version.length > 32) {
      throw new Error('MyData encryption key configuration is invalid.');
    }
    return { key, version };
  }

  private assertAllowedProfile(): void {
    if (['demo', 'production'].includes(process.env.APP_ENV ?? '')) {
      throw new Error('Local data key provider is prohibited in this profile.');
    }
  }
}
