import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { SIMULATOR_DATABASE_POOL } from '../../core/database/database.tokens.js';
import {
  finappSimAccount,
  finappSimCustomer,
  finappSimHolding,
  finappSimInstrument,
  finappSimTransaction,
} from '../../database/schema.js';

const BALANCED_WORKER = {
  customerId: '10000000-0000-4000-8000-000000000001',
  accountId: '20000000-0000-4000-8000-000000000001',
  instrumentId: '30000000-0000-4000-8000-000000000001',
  holdingId: '40000000-0000-4000-8000-000000000001',
  transactionId: '50000000-0000-4000-8000-000000000001',
} as const;

@Injectable()
export class AccountRepository {
  private readonly database;

  constructor(@Inject(SIMULATOR_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool);
  }

  async seedBalancedWorker(): Promise<void> {
    const asOfAt = new Date('2026-09-01T00:00:00.000Z');

    await this.database.transaction(async (transaction) => {
      await transaction
        .insert(finappSimCustomer)
        .values({
          id: BALANCED_WORKER.customerId,
          externalCustomerId: 'SYNTH-CUSTOMER-A',
          preset: 'BALANCED_WORKER',
          displayName: '테스트 사용자 A',
          seed: 20260901n,
          datasetVersion: 'FINANCIAL_APP_DATASET_V1',
          createdAt: asOfAt,
        })
        .onConflictDoNothing();
      await transaction
        .insert(finappSimInstrument)
        .values({
          id: BALANCED_WORKER.instrumentId,
          instrumentCode: 'SYNTH-EQUITY-001',
          displayName: '가상 성장형 펀드',
          assetClass: 'EQUITY',
          currency: 'KRW',
          status: 'ACTIVE',
        })
        .onConflictDoNothing();
      await transaction
        .insert(finappSimAccount)
        .values({
          id: BALANCED_WORKER.accountId,
          customerId: BALANCED_WORKER.customerId,
          externalAccountId: 'SYNTH-ACCOUNT-A-001',
          maskedAccountNumber: 'SYNTH-****-0001',
          accountType: 'BROKERAGE',
          currency: 'KRW',
          cashBalance: '15400000.0000',
          status: 'ACTIVE',
          createdAt: asOfAt,
          updatedAt: asOfAt,
        })
        .onConflictDoNothing();
      await transaction
        .insert(finappSimHolding)
        .values({
          id: BALANCED_WORKER.holdingId,
          accountId: BALANCED_WORKER.accountId,
          instrumentId: BALANCED_WORKER.instrumentId,
          externalHoldingId: 'SYNTH-HOLDING-A-001',
          quantity: '1360.00000000',
          averagePrice: '125000.0000',
          asOfAt,
        })
        .onConflictDoNothing();
      await transaction
        .insert(finappSimTransaction)
        .values({
          id: BALANCED_WORKER.transactionId,
          accountId: BALANCED_WORKER.accountId,
          externalTransactionId: 'SYNTH-TX-A-001',
          transactionType: 'DEPOSIT',
          amount: '1500000.0000',
          currency: 'KRW',
          occurredAt: new Date('2026-08-25T00:00:00.000Z'),
        })
        .onConflictDoNothing();
    });
  }

  async accounts(externalCustomerId: string) {
    return this.database
      .select({
        externalAccountId: finappSimAccount.externalAccountId,
        maskedAccountNumber: finappSimAccount.maskedAccountNumber,
        accountType: finappSimAccount.accountType,
        currency: finappSimAccount.currency,
        cashBalance: finappSimAccount.cashBalance,
        status: finappSimAccount.status,
      })
      .from(finappSimAccount)
      .innerJoin(
        finappSimCustomer,
        eq(finappSimAccount.customerId, finappSimCustomer.id),
      )
      .where(eq(finappSimCustomer.externalCustomerId, externalCustomerId))
      .orderBy(asc(finappSimAccount.externalAccountId));
  }

  async holdings(externalCustomerId: string) {
    return this.database
      .select({
        externalAccountId: finappSimAccount.externalAccountId,
        externalHoldingId: finappSimHolding.externalHoldingId,
        instrumentCode: finappSimInstrument.instrumentCode,
        displayName: finappSimInstrument.displayName,
        assetClass: finappSimInstrument.assetClass,
        quantity: finappSimHolding.quantity,
        averagePrice: finappSimHolding.averagePrice,
        asOfAt: finappSimHolding.asOfAt,
      })
      .from(finappSimHolding)
      .innerJoin(
        finappSimAccount,
        eq(finappSimHolding.accountId, finappSimAccount.id),
      )
      .innerJoin(
        finappSimCustomer,
        eq(finappSimAccount.customerId, finappSimCustomer.id),
      )
      .innerJoin(
        finappSimInstrument,
        eq(finappSimHolding.instrumentId, finappSimInstrument.id),
      )
      .where(eq(finappSimCustomer.externalCustomerId, externalCustomerId))
      .orderBy(asc(finappSimHolding.externalHoldingId));
  }

  async transactions(externalCustomerId: string) {
    return this.database
      .select({
        externalAccountId: finappSimAccount.externalAccountId,
        externalTransactionId: finappSimTransaction.externalTransactionId,
        transactionType: finappSimTransaction.transactionType,
        amount: finappSimTransaction.amount,
        currency: finappSimTransaction.currency,
        occurredAt: finappSimTransaction.occurredAt,
      })
      .from(finappSimTransaction)
      .innerJoin(
        finappSimAccount,
        eq(finappSimTransaction.accountId, finappSimAccount.id),
      )
      .innerJoin(
        finappSimCustomer,
        eq(finappSimAccount.customerId, finappSimCustomer.id),
      )
      .where(eq(finappSimCustomer.externalCustomerId, externalCustomerId))
      .orderBy(asc(finappSimTransaction.occurredAt));
  }
}
