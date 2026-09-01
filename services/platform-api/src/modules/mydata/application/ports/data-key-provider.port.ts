export const DATA_KEY_PROVIDER = Symbol('DATA_KEY_PROVIDER');

export interface DataKeyContext {
  readonly application: 'financial-app';
  readonly schema: 'finapp_mydata';
  readonly table: 'finapp_institution_connection';
  readonly column: 'external_customer_id_ciphertext';
  readonly scopeType: 'USER';
  readonly scopeId: string;
}

export interface GeneratedDataKey {
  readonly plaintextKey: Buffer;
  readonly encryptedDataKey: Buffer;
  readonly keyVersion: string;
}

export interface DataKeyProvider {
  generateDataKey(context: DataKeyContext): Promise<GeneratedDataKey>;
  decryptDataKey(
    encryptedDataKey: Buffer,
    keyVersion: string,
    context: DataKeyContext,
  ): Promise<Buffer>;
  lookupHash(value: string, context: DataKeyContext): Promise<string>;
}
