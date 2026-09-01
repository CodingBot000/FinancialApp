import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type {
  EncryptedValue,
  SensitiveDataPort,
} from '../../application/ports/sensitive-data.port.js';

const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class AesSensitiveDataAdapter implements SensitiveDataPort {
  encrypt(plaintext: string): EncryptedValue {
    const { key, version } = this.loadKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return {
      ciphertext: Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
      keyVersion: version,
    };
  }

  decrypt(ciphertext: Buffer, keyVersion: string): string {
    const { key, version } = this.loadKey();
    if (keyVersion !== version || ciphertext.length <= IV_BYTES + TAG_BYTES) {
      throw new Error('Encrypted customer identifier cannot be decrypted.');
    }

    const iv = ciphertext.subarray(0, IV_BYTES);
    const tag = ciphertext.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const encrypted = ciphertext.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  lookupHash(value: string): string {
    const { key } = this.loadKey();
    return createHmac('sha256', key).update(value, 'utf8').digest('hex');
  }

  private loadKey(): { readonly key: Buffer; readonly version: string } {
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
}
