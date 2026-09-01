export const SENSITIVE_DATA_PORT = Symbol('SENSITIVE_DATA_PORT');

export interface EncryptedValue {
  readonly ciphertext: Buffer;
  readonly keyVersion: string;
}

export interface SensitiveDataPort {
  encrypt(plaintext: string, ownerId: string): Promise<EncryptedValue>;
  decrypt(
    ciphertext: Buffer,
    keyVersion: string,
    ownerId: string,
  ): Promise<string>;
  lookupHash(value: string, ownerId: string): Promise<string>;
}
