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

export interface ScheduledConnection {
  readonly connectionId: string;
  readonly userId: string;
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
  rescheduleOrFailSync(
    syncId: string,
    errorCode: string,
    maxAttempts: number,
    retryAt: Date,
  ): Promise<'QUEUED' | 'FAILED' | undefined>;
  listDueConnections(
    lastSyncBefore: Date,
    now: Date,
    limit: number,
  ): Promise<readonly ScheduledConnection[]>;
  listDueSyncIds(now: Date, limit: number): Promise<readonly string[]>;
  recoverStaleSyncs(
    staleBefore: Date,
    maxAttempts: number,
    retryAt: Date,
  ): Promise<number>;
}
