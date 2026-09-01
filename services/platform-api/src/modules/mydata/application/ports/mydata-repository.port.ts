import type {
  ConnectionView,
  InstitutionDataset,
  SyncView,
} from '../../domain/institution-data.js';

export const MYDATA_REPOSITORY = Symbol('MYDATA_REPOSITORY');

export interface CreateConnectionInput {
  readonly userId: string;
  readonly institutionCode: string;
  readonly externalCustomerIdHash: string;
  readonly externalCustomerIdCiphertext: Buffer;
  readonly encryptionKeyVersion: string;
  readonly maskedExternalCustomerId: string;
  readonly consentExpiresAt: Date;
}

export interface SyncConnection {
  readonly connectionId: string;
  readonly userId: string;
  readonly ciphertext: Buffer;
  readonly encryptionKeyVersion: string;
}

export interface MyDataRepository {
  createConnection(input: CreateConnectionInput): Promise<ConnectionView>;
  listConnections(userId: string): Promise<readonly ConnectionView[]>;
  createSync(
    userId: string,
    connectionId: string,
  ): Promise<{ readonly sync: SyncView; readonly created: boolean }>;
  getSync(userId: string, syncId: string): Promise<SyncView | undefined>;
  beginSync(syncId: string): Promise<SyncConnection | undefined>;
  completeSync(syncId: string, dataset: InstitutionDataset): Promise<void>;
  failSync(syncId: string, errorCode: string): Promise<void>;
}
