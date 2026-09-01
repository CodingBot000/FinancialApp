export const SENSITIVE_DATA_PORT = Symbol('SENSITIVE_DATA_PORT');

export interface EncryptedValue {
  readonly ciphertext: Buffer;
  readonly keyVersion: string;
}

export interface SensitiveDataPort {
  encrypt(plaintext: string): EncryptedValue;
  decrypt(ciphertext: Buffer, keyVersion: string): string;
  lookupHash(value: string): string;
}
