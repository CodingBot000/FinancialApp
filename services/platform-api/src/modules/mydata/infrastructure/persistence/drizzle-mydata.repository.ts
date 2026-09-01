import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappAssetSnapshot,
  finappAssetSnapshotAllocation,
  finappCashAccount,
  finappFinancialAccount,
  finappFinancialTransaction,
  finappHolding,
  finappInstitutionConnection,
  finappInstrument,
  finappRawBatch,
  finappRawProcessingResult,
  finappRawRecord,
  finappSyncJob,
} from '../../../../database/schema.js';
import type {
  CreateConnectionInput,
  MyDataRepository,
  SyncConnection,
} from '../../application/ports/mydata-repository.port.js';
import type {
  ConnectionView,
  InstitutionDataset,
  SyncStatus,
  SyncView,
} from '../../domain/institution-data.js';
import {
  MyDataConnectionConflictError,
  MyDataResourceNotFoundError,
} from '../../domain/mydata-errors.js';
import { payloadChecksum } from './canonical-json.js';
import {
  allocationWeight,
  formatMoney,
  holdingValue,
  money,
} from './fixed-decimal.js';

const schema = {
  finappAssetSnapshot,
  finappAssetSnapshotAllocation,
  finappCashAccount,
  finappFinancialAccount,
  finappFinancialTransaction,
  finappHolding,
  finappInstitutionConnection,
  finappInstrument,
  finappRawBatch,
  finappRawProcessingResult,
  finappRawRecord,
  finappSyncJob,
};

type Database = NodePgDatabase<typeof schema>;
type PostgreSqlError = { readonly code?: string };
const ACTIVE_SYNC_STATUSES = [
  'QUEUED',
  'FETCHING',
  'RAW_STORED',
  'NORMALIZING',
] as const;
const PROCESSOR_VERSION = 'NORMALIZER_V1';

function isUniqueViolation(error: unknown): error is PostgreSqlError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

function connectionView(row: {
  readonly id: string;
  readonly institutionCode: string;
  readonly status: string;
  readonly consentExpiresAt: Date;
  readonly lastSuccessfulSyncAt: Date | null;
}): ConnectionView {
  return {
    connectionId: row.id,
    institutionCode: row.institutionCode,
    status: row.status,
    consentExpiresAt: row.consentExpiresAt.toISOString(),
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt?.toISOString() ?? null,
  };
}

@Injectable()
export class DrizzleMyDataRepository implements MyDataRepository {
  private readonly database: Database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool, { schema });
  }

  async createConnection(
    input: CreateConnectionInput,
  ): Promise<ConnectionView> {
    const now = new Date();
    try {
      const rows = await this.database
        .insert(finappInstitutionConnection)
        .values({
          id: randomUUID(),
          userId: input.userId,
          institutionCode: input.institutionCode,
          externalCustomerIdHash: input.externalCustomerIdHash,
          externalCustomerIdCiphertext: input.externalCustomerIdCiphertext,
          encryptionKeyVersion: input.encryptionKeyVersion,
          maskedExternalCustomerId: input.maskedExternalCustomerId,
          status: 'ACTIVE',
          consentExpiresAt: input.consentExpiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const row = rows[0];
      if (row === undefined)
        throw new Error('Connection insert returned no row.');
      return connectionView(row);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new MyDataConnectionConflictError();
      }
      throw error;
    }
  }

  async listConnections(userId: string): Promise<readonly ConnectionView[]> {
    const rows = await this.database
      .select()
      .from(finappInstitutionConnection)
      .where(eq(finappInstitutionConnection.userId, userId))
      .orderBy(asc(finappInstitutionConnection.createdAt));
    return rows.map(connectionView);
  }

  async createSync(
    userId: string,
    connectionId: string,
  ): Promise<{ readonly sync: SyncView; readonly created: boolean }> {
    const owned = await this.database
      .select({ id: finappInstitutionConnection.id })
      .from(finappInstitutionConnection)
      .where(
        and(
          eq(finappInstitutionConnection.id, connectionId),
          eq(finappInstitutionConnection.userId, userId),
          eq(finappInstitutionConnection.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (owned[0] === undefined) throw new MyDataResourceNotFoundError();

    const existing = await this.findActiveSync(connectionId);
    if (existing !== undefined) {
      return {
        sync: await this.requireSync(userId, existing.id),
        created: false,
      };
    }

    try {
      const now = new Date();
      const rows = await this.database
        .insert(finappSyncJob)
        .values({
          id: randomUUID(),
          connectionId,
          status: 'QUEUED',
          attempt: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: finappSyncJob.id });
      const id = rows[0]?.id;
      if (id === undefined) throw new Error('Sync insert returned no row.');
      return { sync: await this.requireSync(userId, id), created: true };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const winner = await this.findActiveSync(connectionId);
        if (winner !== undefined) {
          return {
            sync: await this.requireSync(userId, winner.id),
            created: false,
          };
        }
      }
      throw error;
    }
  }

  async getSync(userId: string, syncId: string): Promise<SyncView | undefined> {
    const jobs = await this.database
      .select({
        id: finappSyncJob.id,
        connectionId: finappSyncJob.connectionId,
        status: finappSyncJob.status,
        createdAt: finappSyncJob.createdAt,
        startedAt: finappSyncJob.startedAt,
        completedAt: finappSyncJob.completedAt,
        errorCode: finappSyncJob.errorCode,
      })
      .from(finappSyncJob)
      .innerJoin(
        finappInstitutionConnection,
        eq(finappSyncJob.connectionId, finappInstitutionConnection.id),
      )
      .where(
        and(
          eq(finappSyncJob.id, syncId),
          eq(finappInstitutionConnection.userId, userId),
        ),
      )
      .limit(1);
    const job = jobs[0];
    if (job === undefined) return undefined;

    const [rawRows, accountRows, holdingRows, transactionRows] =
      await Promise.all([
        this.database
          .select({ value: count() })
          .from(finappRawRecord)
          .innerJoin(
            finappRawBatch,
            eq(finappRawRecord.rawBatchId, finappRawBatch.id),
          )
          .where(eq(finappRawBatch.syncJobId, syncId)),
        this.database
          .select({ value: count() })
          .from(finappFinancialAccount)
          .where(eq(finappFinancialAccount.connectionId, job.connectionId)),
        this.database
          .select({ value: count() })
          .from(finappHolding)
          .innerJoin(
            finappFinancialAccount,
            eq(finappHolding.accountId, finappFinancialAccount.id),
          )
          .where(eq(finappFinancialAccount.connectionId, job.connectionId)),
        this.database
          .select({ value: count() })
          .from(finappFinancialTransaction)
          .innerJoin(
            finappFinancialAccount,
            eq(finappFinancialTransaction.accountId, finappFinancialAccount.id),
          )
          .where(eq(finappFinancialAccount.connectionId, job.connectionId)),
      ]);

    return {
      syncId: job.id,
      connectionId: job.connectionId,
      status: job.status as SyncStatus,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      counts: {
        rawRecords: rawRows[0]?.value ?? 0,
        accounts: accountRows[0]?.value ?? 0,
        holdings: holdingRows[0]?.value ?? 0,
        transactions: transactionRows[0]?.value ?? 0,
      },
      errorCode: job.errorCode,
    };
  }

  async beginSync(syncId: string): Promise<SyncConnection | undefined> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const claimed = await transaction
        .update(finappSyncJob)
        .set({
          status: 'FETCHING',
          attempt: sql`${finappSyncJob.attempt} + 1`,
          startedAt: now,
          updatedAt: now,
          lockedAt: now,
          lockedBy: `platform-${process.pid}`,
        })
        .where(
          and(eq(finappSyncJob.id, syncId), eq(finappSyncJob.status, 'QUEUED')),
        )
        .returning({ connectionId: finappSyncJob.connectionId });
      const connectionId = claimed[0]?.connectionId;
      if (connectionId === undefined) return undefined;

      const rows = await transaction
        .select({
          connectionId: finappInstitutionConnection.id,
          userId: finappInstitutionConnection.userId,
          ciphertext: finappInstitutionConnection.externalCustomerIdCiphertext,
          encryptionKeyVersion:
            finappInstitutionConnection.encryptionKeyVersion,
        })
        .from(finappInstitutionConnection)
        .where(eq(finappInstitutionConnection.id, connectionId))
        .limit(1);
      return rows[0];
    });
  }

  async completeSync(
    syncId: string,
    dataset: InstitutionDataset,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const jobs = await transaction
        .select({
          connectionId: finappSyncJob.connectionId,
          userId: finappInstitutionConnection.userId,
          institutionCode: finappInstitutionConnection.institutionCode,
        })
        .from(finappSyncJob)
        .innerJoin(
          finappInstitutionConnection,
          eq(finappSyncJob.connectionId, finappInstitutionConnection.id),
        )
        .where(
          and(
            eq(finappSyncJob.id, syncId),
            eq(finappSyncJob.status, 'FETCHING'),
          ),
        )
        .limit(1);
      const job = jobs[0];
      if (job === undefined) throw new Error('Sync job is not fetchable.');
      const now = new Date();

      const rawAccounts = await this.storeRawPage(
        transaction,
        syncId,
        'ACCOUNT',
        dataset.accounts,
        (item) => item.externalAccountId,
      );
      const rawHoldings = await this.storeRawPage(
        transaction,
        syncId,
        'HOLDING',
        dataset.holdings,
        (item) => item.externalHoldingId,
      );
      const rawTransactions = await this.storeRawPage(
        transaction,
        syncId,
        'TRANSACTION',
        dataset.transactions,
        (item) => item.externalTransactionId,
      );

      await transaction
        .update(finappSyncJob)
        .set({ status: 'RAW_STORED', updatedAt: now })
        .where(eq(finappSyncJob.id, syncId));
      await transaction
        .update(finappSyncJob)
        .set({ status: 'NORMALIZING', updatedAt: now })
        .where(eq(finappSyncJob.id, syncId));

      const accountIds = new Map<string, string>();
      for (const [index, account] of dataset.accounts.items.entries()) {
        const externalHash = payloadChecksum(account.externalAccountId);
        const accountId = randomUUID();
        const rows = await transaction
          .insert(finappFinancialAccount)
          .values({
            id: accountId,
            userId: job.userId,
            connectionId: job.connectionId,
            institutionCode: job.institutionCode,
            externalAccountIdHash: externalHash,
            maskedAccountNumber: account.maskedAccountNumber,
            accountType: account.accountType,
            currency: account.currency,
            status: account.status,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              finappFinancialAccount.connectionId,
              finappFinancialAccount.externalAccountIdHash,
            ],
            set: {
              maskedAccountNumber: account.maskedAccountNumber,
              accountType: account.accountType,
              currency: account.currency,
              status: account.status,
              updatedAt: now,
            },
          })
          .returning({ id: finappFinancialAccount.id });
        const derivedId = rows[0]?.id;
        const rawRecordId = rawAccounts[index];
        if (derivedId === undefined || rawRecordId === undefined) {
          throw new Error('Account normalization returned no row.');
        }
        accountIds.set(account.externalAccountId, derivedId);
        await transaction
          .insert(finappCashAccount)
          .values({
            id: randomUUID(),
            userId: job.userId,
            accountId: derivedId,
            availableBalance: account.cashBalance,
            reservedBalance: '0.0000',
            currency: account.currency,
            version: 0n,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: finappCashAccount.accountId,
            set: {
              availableBalance: account.cashBalance,
              currency: account.currency,
              version: sql`${finappCashAccount.version} + 1`,
              updatedAt: now,
            },
          });
        await this.recordProcessed(
          transaction,
          rawRecordId,
          'FINANCIAL_ACCOUNT',
          derivedId,
          now,
        );
      }

      const investmentByClass = new Map<string, bigint>();
      let snapshotDate = now.toISOString().slice(0, 10);
      for (const [index, holding] of dataset.holdings.items.entries()) {
        const accountId = accountIds.get(holding.externalAccountId);
        const rawRecordId = rawHoldings[index];
        if (accountId === undefined || rawRecordId === undefined) {
          throw new Error('Holding references an unknown account.');
        }
        const instrumentRows = await transaction
          .insert(finappInstrument)
          .values({
            id: randomUUID(),
            instrumentCode: holding.instrumentCode,
            displayName: holding.displayName,
            assetClass: holding.assetClass,
            currency: 'KRW',
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: finappInstrument.instrumentCode,
            set: {
              displayName: holding.displayName,
              assetClass: holding.assetClass,
              updatedAt: now,
            },
          })
          .returning({ id: finappInstrument.id });
        const instrumentId = instrumentRows[0]?.id;
        if (instrumentId === undefined) {
          throw new Error('Instrument normalization returned no row.');
        }
        const holdingRows = await transaction
          .insert(finappHolding)
          .values({
            id: randomUUID(),
            userId: job.userId,
            accountId,
            instrumentId,
            externalHoldingId: holding.externalHoldingId,
            quantity: holding.quantity,
            averagePrice: holding.averagePrice,
            asOfAt: new Date(holding.asOfAt),
            version: 0n,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [finappHolding.accountId, finappHolding.instrumentId],
            set: {
              externalHoldingId: holding.externalHoldingId,
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              asOfAt: new Date(holding.asOfAt),
              version: sql`${finappHolding.version} + 1`,
              updatedAt: now,
            },
          })
          .returning({ id: finappHolding.id });
        const derivedId = holdingRows[0]?.id;
        if (derivedId === undefined) {
          throw new Error('Holding normalization returned no row.');
        }
        const amount = holdingValue(holding.quantity, holding.averagePrice);
        investmentByClass.set(
          holding.assetClass,
          (investmentByClass.get(holding.assetClass) ?? 0n) + amount,
        );
        snapshotDate = new Date(holding.asOfAt).toISOString().slice(0, 10);
        await this.recordProcessed(
          transaction,
          rawRecordId,
          'HOLDING',
          derivedId,
          now,
        );
      }

      for (const [
        index,
        externalTransaction,
      ] of dataset.transactions.items.entries()) {
        const accountId = accountIds.get(externalTransaction.externalAccountId);
        const rawRecordId = rawTransactions[index];
        if (accountId === undefined || rawRecordId === undefined) {
          throw new Error('Transaction references an unknown account.');
        }
        const rows = await transaction
          .insert(finappFinancialTransaction)
          .values({
            id: randomUUID(),
            userId: job.userId,
            accountId,
            externalTransactionId: externalTransaction.externalTransactionId,
            transactionType: externalTransaction.transactionType,
            amount: externalTransaction.amount,
            currency: externalTransaction.currency,
            occurredAt: new Date(externalTransaction.occurredAt),
            rawRecordId,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [
              finappFinancialTransaction.accountId,
              finappFinancialTransaction.externalTransactionId,
            ],
            set: {
              transactionType: externalTransaction.transactionType,
              amount: externalTransaction.amount,
              currency: externalTransaction.currency,
              occurredAt: new Date(externalTransaction.occurredAt),
              rawRecordId,
            },
          })
          .returning({ id: finappFinancialTransaction.id });
        const derivedId = rows[0]?.id;
        if (derivedId === undefined) {
          throw new Error('Transaction normalization returned no row.');
        }
        await this.recordProcessed(
          transaction,
          rawRecordId,
          'FINANCIAL_TRANSACTION',
          derivedId,
          now,
        );
      }

      const cash = dataset.accounts.items.reduce(
        (total, account) => total + money(account.cashBalance),
        0n,
      );
      const investments = [...investmentByClass.values()].reduce(
        (total, amount) => total + amount,
        0n,
      );
      const total = cash + investments;
      const snapshotRows = await transaction
        .insert(finappAssetSnapshot)
        .values({
          id: randomUUID(),
          userId: job.userId,
          asOfDate: snapshotDate,
          currency: 'KRW',
          totalAssets: formatMoney(total),
          cashAmount: formatMoney(cash),
          investmentAmount: formatMoney(investments),
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: [
            finappAssetSnapshot.userId,
            finappAssetSnapshot.asOfDate,
            finappAssetSnapshot.currency,
          ],
          set: {
            totalAssets: formatMoney(total),
            cashAmount: formatMoney(cash),
            investmentAmount: formatMoney(investments),
            createdAt: now,
          },
        })
        .returning({ id: finappAssetSnapshot.id });
      const snapshotId = snapshotRows[0]?.id;
      if (snapshotId === undefined)
        throw new Error('Snapshot returned no row.');
      await transaction
        .delete(finappAssetSnapshotAllocation)
        .where(eq(finappAssetSnapshotAllocation.snapshotId, snapshotId));
      const allocations = [
        { assetClass: 'CASH', amount: cash },
        ...[...investmentByClass].map(([assetClass, amount]) => ({
          assetClass,
          amount,
        })),
      ].filter(({ amount }) => amount > 0n);
      if (allocations.length > 0) {
        await transaction.insert(finappAssetSnapshotAllocation).values(
          allocations.map(({ assetClass, amount }) => ({
            id: randomUUID(),
            snapshotId,
            assetClass,
            amount: formatMoney(amount),
            weight: allocationWeight(amount, total),
          })),
        );
      }

      await transaction
        .update(finappInstitutionConnection)
        .set({ lastSuccessfulSyncAt: now, updatedAt: now })
        .where(eq(finappInstitutionConnection.id, job.connectionId));
      await transaction
        .update(finappSyncJob)
        .set({
          status: 'COMPLETED',
          completedAt: now,
          updatedAt: now,
          lockedAt: null,
          lockedBy: null,
          errorCode: null,
        })
        .where(eq(finappSyncJob.id, syncId));
    });
  }

  async failSync(syncId: string, errorCode: string): Promise<void> {
    const now = new Date();
    await this.database
      .update(finappSyncJob)
      .set({
        status: 'FAILED',
        errorCode,
        completedAt: now,
        updatedAt: now,
        lockedAt: null,
        lockedBy: null,
      })
      .where(
        and(
          eq(finappSyncJob.id, syncId),
          inArray(finappSyncJob.status, ACTIVE_SYNC_STATUSES),
        ),
      );
  }

  private async findActiveSync(
    connectionId: string,
  ): Promise<{ readonly id: string } | undefined> {
    const rows = await this.database
      .select({ id: finappSyncJob.id })
      .from(finappSyncJob)
      .where(
        and(
          eq(finappSyncJob.connectionId, connectionId),
          inArray(finappSyncJob.status, ACTIVE_SYNC_STATUSES),
        ),
      )
      .orderBy(desc(finappSyncJob.createdAt))
      .limit(1);
    return rows[0];
  }

  private async requireSync(userId: string, syncId: string): Promise<SyncView> {
    const sync = await this.getSync(userId, syncId);
    if (sync === undefined) throw new MyDataResourceNotFoundError();
    return sync;
  }

  private async storeRawPage<T>(
    database: Database,
    syncId: string,
    resourceType: 'ACCOUNT' | 'HOLDING' | 'TRANSACTION',
    page: {
      readonly schemaVersion: string;
      readonly items: readonly T[];
      readonly nextCursor: null;
      readonly requestId: string;
    },
    externalId: (item: T) => string,
  ): Promise<readonly string[]> {
    const receivedAt = new Date();
    const batchRows = await database
      .insert(finappRawBatch)
      .values({
        id: randomUUID(),
        syncJobId: syncId,
        resourceType,
        requestId: page.requestId,
        schemaVersion: page.schemaVersion,
        pageCursor: page.nextCursor,
        payloadChecksum: payloadChecksum(page),
        receivedAt,
      })
      .returning({ id: finappRawBatch.id });
    const batchId = batchRows[0]?.id;
    if (batchId === undefined) throw new Error('Raw batch returned no row.');
    if (page.items.length === 0) return [];
    const records = await database
      .insert(finappRawRecord)
      .values(
        page.items.map((item) => ({
          id: randomUUID(),
          rawBatchId: batchId,
          resourceType,
          externalResourceId: externalId(item),
          payload: item,
          payloadChecksum: payloadChecksum(item),
          receivedAt,
        })),
      )
      .returning({ id: finappRawRecord.id });
    return records.map(({ id }) => id);
  }

  private async recordProcessed(
    database: Database,
    rawRecordId: string,
    derivedResourceType: string,
    derivedResourceId: string,
    processedAt: Date,
  ): Promise<void> {
    await database.insert(finappRawProcessingResult).values({
      id: randomUUID(),
      rawRecordId,
      processorVersion: PROCESSOR_VERSION,
      status: 'PROCESSED',
      derivedResourceType,
      derivedResourceId,
      processedAt,
    });
  }
}
