import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
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
} from '../../../../database/schema.js';
import type { WealthRepository } from '../../application/ports/wealth-repository.port.js';
import type {
  AccountView,
  AssetHistoryPoint,
  AssetSummaryView,
  HoldingView,
  TransactionView,
} from '../../domain/wealth-views.js';

const schema = {
  finappAssetSnapshot,
  finappAssetSnapshotAllocation,
  finappCashAccount,
  finappFinancialAccount,
  finappFinancialTransaction,
  finappHolding,
  finappInstitutionConnection,
  finappInstrument,
};

type Database = NodePgDatabase<typeof schema>;

function scaled(value: string, scale: number): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, '0').slice(0, scale) || '0')
  );
}

function formatMoney(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 10_000n}.${(absolute % 10_000n).toString().padStart(4, '0')}`;
}

function marketValue(quantity: string, averagePrice: string): string {
  return formatMoney(
    (scaled(quantity, 8) * scaled(averagePrice, 4)) / 100_000_000n,
  );
}

function startDate(range: '1M' | '3M' | '1Y' | 'ALL'): string | undefined {
  if (range === 'ALL') return undefined;
  const date = new Date();
  if (range === '1M') date.setUTCMonth(date.getUTCMonth() - 1);
  if (range === '3M') date.setUTCMonth(date.getUTCMonth() - 3);
  if (range === '1Y') date.setUTCFullYear(date.getUTCFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DrizzleWealthRepository implements WealthRepository {
  private readonly database: Database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool, { schema });
  }

  async summary(userId: string): Promise<AssetSummaryView> {
    const snapshots = await this.database
      .select()
      .from(finappAssetSnapshot)
      .where(eq(finappAssetSnapshot.userId, userId))
      .orderBy(desc(finappAssetSnapshot.asOfDate))
      .limit(2);
    const current = snapshots[0];
    const connections = await this.database
      .select({
        lastSyncedAt: finappInstitutionConnection.lastSuccessfulSyncAt,
      })
      .from(finappInstitutionConnection)
      .where(eq(finappInstitutionConnection.userId, userId))
      .orderBy(desc(finappInstitutionConnection.lastSuccessfulSyncAt))
      .limit(1);
    if (current === undefined) {
      return {
        asOfDate: new Date().toISOString().slice(0, 10),
        currency: 'KRW',
        totalAssets: '0.0000',
        cash: '0.0000',
        investments: '0.0000',
        change: { amount: '0.0000', rate: 0 },
        allocation: [],
        lastSyncedAt: connections[0]?.lastSyncedAt?.toISOString() ?? null,
      };
    }
    const allocations = await this.database
      .select({
        assetClass: finappAssetSnapshotAllocation.assetClass,
        amount: finappAssetSnapshotAllocation.amount,
        weight: finappAssetSnapshotAllocation.weight,
      })
      .from(finappAssetSnapshotAllocation)
      .where(eq(finappAssetSnapshotAllocation.snapshotId, current.id))
      .orderBy(asc(finappAssetSnapshotAllocation.assetClass));
    const previous = snapshots[1];
    const change =
      scaled(current.totalAssets, 4) -
      scaled(previous?.totalAssets ?? current.totalAssets, 4);
    const previousTotal = scaled(
      previous?.totalAssets ?? current.totalAssets,
      4,
    );

    return {
      asOfDate: current.asOfDate,
      currency: current.currency,
      totalAssets: current.totalAssets,
      cash: current.cashAmount,
      investments: current.investmentAmount,
      change: {
        amount: formatMoney(change),
        rate: previousTotal === 0n ? 0 : Number(change) / Number(previousTotal),
      },
      allocation: allocations.map((allocation) => ({
        assetClass: allocation.assetClass,
        amount: allocation.amount,
        weight: Number(allocation.weight),
      })),
      lastSyncedAt: connections[0]?.lastSyncedAt?.toISOString() ?? null,
    };
  }

  async accounts(userId: string): Promise<readonly AccountView[]> {
    const rows = await this.database
      .select({
        accountId: finappFinancialAccount.id,
        institutionCode: finappFinancialAccount.institutionCode,
        maskedAccountNumber: finappFinancialAccount.maskedAccountNumber,
        accountType: finappFinancialAccount.accountType,
        currency: finappFinancialAccount.currency,
        status: finappFinancialAccount.status,
        cashBalance: finappCashAccount.availableBalance,
      })
      .from(finappFinancialAccount)
      .leftJoin(
        finappCashAccount,
        eq(finappCashAccount.accountId, finappFinancialAccount.id),
      )
      .where(eq(finappFinancialAccount.userId, userId))
      .orderBy(asc(finappFinancialAccount.createdAt));
    return rows.map((row) => ({
      ...row,
      cashBalance: row.cashBalance ?? '0.0000',
    }));
  }

  async account(
    userId: string,
    accountId: string,
  ): Promise<AccountView | undefined> {
    const rows = await this.database
      .select({
        accountId: finappFinancialAccount.id,
        institutionCode: finappFinancialAccount.institutionCode,
        maskedAccountNumber: finappFinancialAccount.maskedAccountNumber,
        accountType: finappFinancialAccount.accountType,
        currency: finappFinancialAccount.currency,
        status: finappFinancialAccount.status,
        cashBalance: finappCashAccount.availableBalance,
      })
      .from(finappFinancialAccount)
      .leftJoin(
        finappCashAccount,
        eq(finappCashAccount.accountId, finappFinancialAccount.id),
      )
      .where(
        and(
          eq(finappFinancialAccount.userId, userId),
          eq(finappFinancialAccount.id, accountId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined
      ? undefined
      : { ...row, cashBalance: row.cashBalance ?? '0.0000' };
  }

  async holdings(
    userId: string,
    accountId?: string,
  ): Promise<readonly HoldingView[]> {
    const rows = await this.database
      .select({
        holdingId: finappHolding.id,
        accountId: finappHolding.accountId,
        instrumentId: finappInstrument.id,
        instrumentCode: finappInstrument.instrumentCode,
        displayName: finappInstrument.displayName,
        assetClass: finappInstrument.assetClass,
        quantity: finappHolding.quantity,
        averagePrice: finappHolding.averagePrice,
        asOfAt: finappHolding.asOfAt,
      })
      .from(finappHolding)
      .innerJoin(
        finappInstrument,
        eq(finappHolding.instrumentId, finappInstrument.id),
      )
      .where(
        accountId === undefined
          ? eq(finappHolding.userId, userId)
          : and(
              eq(finappHolding.userId, userId),
              eq(finappHolding.accountId, accountId),
            ),
      )
      .orderBy(asc(finappInstrument.instrumentCode));
    return rows.map((row) => ({
      ...row,
      marketValue: marketValue(row.quantity, row.averagePrice),
      asOfAt: row.asOfAt.toISOString(),
    }));
  }

  async transactions(userId: string): Promise<readonly TransactionView[]> {
    const rows = await this.database
      .select({
        transactionId: finappFinancialTransaction.id,
        accountId: finappFinancialTransaction.accountId,
        transactionType: finappFinancialTransaction.transactionType,
        amount: finappFinancialTransaction.amount,
        currency: finappFinancialTransaction.currency,
        occurredAt: finappFinancialTransaction.occurredAt,
      })
      .from(finappFinancialTransaction)
      .where(eq(finappFinancialTransaction.userId, userId))
      .orderBy(desc(finappFinancialTransaction.occurredAt));
    return rows.map((row) => ({
      ...row,
      occurredAt: row.occurredAt.toISOString(),
    }));
  }

  async history(
    userId: string,
    range: '1M' | '3M' | '1Y' | 'ALL',
  ): Promise<readonly AssetHistoryPoint[]> {
    const since = startDate(range);
    const rows = await this.database
      .select({
        date: finappAssetSnapshot.asOfDate,
        totalAssets: finappAssetSnapshot.totalAssets,
        cash: finappAssetSnapshot.cashAmount,
        investments: finappAssetSnapshot.investmentAmount,
      })
      .from(finappAssetSnapshot)
      .where(
        since === undefined
          ? eq(finappAssetSnapshot.userId, userId)
          : and(
              eq(finappAssetSnapshot.userId, userId),
              gte(finappAssetSnapshot.asOfDate, since),
            ),
      )
      .orderBy(asc(finappAssetSnapshot.asOfDate))
      .limit(range === 'ALL' ? 1000 : 366);
    return rows;
  }
}
