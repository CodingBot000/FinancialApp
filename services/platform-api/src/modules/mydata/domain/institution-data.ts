export interface InstitutionAccount {
  readonly externalAccountId: string;
  readonly maskedAccountNumber: string;
  readonly accountType: string;
  readonly currency: string;
  readonly cashBalance: string;
  readonly status: string;
}

export interface InstitutionHolding {
  readonly externalAccountId: string;
  readonly externalHoldingId: string;
  readonly instrumentCode: string;
  readonly displayName: string;
  readonly assetClass: string;
  readonly quantity: string;
  readonly averagePrice: string;
  readonly asOfAt: string;
}

export interface InstitutionTransaction {
  readonly externalAccountId: string;
  readonly externalTransactionId: string;
  readonly transactionType: string;
  readonly amount: string;
  readonly currency: string;
  readonly occurredAt: string;
}

export interface InstitutionPage<T> {
  readonly schemaVersion: 'simulator-v1';
  readonly items: readonly T[];
  readonly nextCursor: null;
  readonly requestId: string;
}

export interface InstitutionDataset {
  readonly accounts: InstitutionPage<InstitutionAccount>;
  readonly holdings: InstitutionPage<InstitutionHolding>;
  readonly transactions: InstitutionPage<InstitutionTransaction>;
}

export type SyncStatus =
  'QUEUED' | 'FETCHING' | 'RAW_STORED' | 'NORMALIZING' | 'COMPLETED' | 'FAILED';

export interface ConnectionView {
  readonly connectionId: string;
  readonly institutionCode: string;
  readonly status: string;
  readonly consentExpiresAt: string;
  readonly lastSuccessfulSyncAt: string | null;
}

export interface SyncView {
  readonly syncId: string;
  readonly connectionId: string;
  readonly status: SyncStatus;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly counts: {
    readonly rawRecords: number;
    readonly accounts: number;
    readonly holdings: number;
    readonly transactions: number;
  };
  readonly errorCode: string | null;
}
