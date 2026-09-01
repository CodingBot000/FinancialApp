import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  DATA_KEY_PROVIDER,
  type DataKeyProvider,
} from '../../application/ports/data-key-provider.port.js';
import type {
  EncryptedValue,
  SensitiveDataPort,
} from '../../application/ports/sensitive-data.port.js';
import {
  customerIdentifierContext,
  serializeDataKeyContext,
} from './data-key-context.js';

const ENVELOPE_MAGIC = Buffer.from('FAE2', 'ascii');
const HEADER_BYTES = ENVELOPE_MAGIC.length + 2;
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class AesSensitiveDataAdapter implements SensitiveDataPort {
  constructor(
    @Inject(DATA_KEY_PROVIDER)
    private readonly dataKeyProvider: DataKeyProvider,
  ) {}

  async encrypt(plaintext: string, ownerId: string): Promise<EncryptedValue> {
    const context = customerIdentifierContext(ownerId);
    const material = await this.dataKeyProvider.generateDataKey(context);
    try {
      if (material.encryptedDataKey.length > 65_535) {
        throw new Error('Encrypted data key is too large.');
      }
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', material.plaintextKey, iv);
      cipher.setAAD(serializeDataKeyContext(context));
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const header = Buffer.alloc(HEADER_BYTES);
      ENVELOPE_MAGIC.copy(header);
      header.writeUInt16BE(material.encryptedDataKey.length, 4);
      return {
        ciphertext: Buffer.concat([
          header,
          material.encryptedDataKey,
          iv,
          cipher.getAuthTag(),
          encrypted,
        ]),
        keyVersion: material.keyVersion,
      };
    } finally {
      material.plaintextKey.fill(0);
    }
  }

  async decrypt(
    ciphertext: Buffer,
    keyVersion: string,
    ownerId: string,
  ): Promise<string> {
    if (!ciphertext.subarray(0, ENVELOPE_MAGIC.length).equals(ENVELOPE_MAGIC)) {
      return this.decryptLegacyLocal(ciphertext, keyVersion);
    }
    try {
      const wrappedLength = ciphertext.readUInt16BE(4);
      const wrappedStart = HEADER_BYTES;
      const ivStart = wrappedStart + wrappedLength;
      const tagStart = ivStart + IV_BYTES;
      const encryptedStart = tagStart + TAG_BYTES;
      if (wrappedLength === 0 || ciphertext.length <= encryptedStart) {
        throw new Error('Invalid envelope.');
      }
      const context = customerIdentifierContext(ownerId);
      const plaintextKey = await this.dataKeyProvider.decryptDataKey(
        ciphertext.subarray(wrappedStart, ivStart),
        keyVersion,
        context,
      );
      try {
        const decipher = createDecipheriv(
          'aes-256-gcm',
          plaintextKey,
          ciphertext.subarray(ivStart, tagStart),
        );
        decipher.setAAD(serializeDataKeyContext(context));
        decipher.setAuthTag(ciphertext.subarray(tagStart, encryptedStart));
        return Buffer.concat([
          decipher.update(ciphertext.subarray(encryptedStart)),
          decipher.final(),
        ]).toString('utf8');
      } finally {
        plaintextKey.fill(0);
      }
    } catch {
      throw new Error('Encrypted customer identifier cannot be decrypted.');
    }
  }

  lookupHash(value: string, ownerId: string): Promise<string> {
    return this.dataKeyProvider.lookupHash(
      value,
      customerIdentifierContext(ownerId),
    );
  }

  private decryptLegacyLocal(ciphertext: Buffer, keyVersion: string): string {
    if (['demo', 'production'].includes(process.env.APP_ENV ?? '')) {
      throw new Error('Legacy local ciphertext is prohibited in this profile.');
    }
    const encoded = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_BASE64;
    const version = process.env.FINAPP_MYDATA_ENCRYPTION_KEY_VERSION;
    const key =
      encoded === undefined ? Buffer.alloc(0) : Buffer.from(encoded, 'base64');
    if (
      key.length !== 32 ||
      keyVersion !== version ||
      ciphertext.length <= IV_BYTES + TAG_BYTES
    ) {
      throw new Error('Encrypted customer identifier cannot be decrypted.');
    }
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        ciphertext.subarray(0, IV_BYTES),
      );
      decipher.setAuthTag(ciphertext.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
      return Buffer.concat([
        decipher.update(ciphertext.subarray(IV_BYTES + TAG_BYTES)),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new Error('Encrypted customer identifier cannot be decrypted.');
    } finally {
      key.fill(0);
    }
  }
}
