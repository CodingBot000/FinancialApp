import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappAppUser,
  finappOidcIdentity,
  finappRiskProfile,
} from '../../../../database/schema.js';
import type { IdentityRepository } from '../../application/ports/identity-repository.port.js';
import type { RiskProfileRepository } from '../../application/ports/risk-profile-repository.port.js';
import type { CurrentUser, RiskLevel } from '../../domain/current-user.js';
import type {
  RiskProfile,
  RiskProfileUpdate,
} from '../../domain/risk-profile.js';

const identitySchema = {
  finappAppUser,
  finappOidcIdentity,
  finappRiskProfile,
};

type IdentityDatabase = NodePgDatabase<typeof identitySchema>;

interface PostgreSqlError {
  readonly code?: string;
}

function isUniqueViolation(error: unknown): error is PostgreSqlError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

@Injectable()
export class DrizzleIdentityRepository
  implements IdentityRepository, RiskProfileRepository
{
  private readonly database: IdentityDatabase;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool, { schema: identitySchema });
  }

  async provisionFromOidc(
    issuer: string,
    subject: string,
  ): Promise<CurrentUser> {
    const existing = await this.findByExternalIdentity(issuer, subject);
    if (existing !== undefined) {
      return existing;
    }

    try {
      return await this.database.transaction(async (transaction) => {
        const concurrentExisting = await this.findByExternalIdentity(
          issuer,
          subject,
          transaction,
        );
        if (concurrentExisting !== undefined) {
          return concurrentExisting;
        }

        const userId = randomUUID();
        const now = new Date();
        const datasetVersion =
          process.env.FINAPP_DATASET_VERSION ?? 'FINANCIAL_APP_DATASET_V1';

        await transaction.insert(finappAppUser).values({
          id: userId,
          displayName: '테스트 사용자 A',
          datasetVersion,
          syntheticData: true,
          createdAt: now,
          updatedAt: now,
        });
        await transaction.insert(finappOidcIdentity).values({
          id: randomUUID(),
          userId,
          issuer,
          subject,
          createdAt: now,
        });
        await transaction.insert(finappRiskProfile).values({
          userId,
          riskLevel: 'BALANCED',
          investmentHorizonMonths: 120,
          monthlyContribution: '1500000.0000',
          version: 0n,
          updatedAt: now,
        });

        return {
          userId,
          displayName: '테스트 사용자 A',
          riskProfile: 'BALANCED',
          datasetVersion,
          syntheticData: true,
        };
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const winner = await this.findByExternalIdentity(issuer, subject);
        if (winner !== undefined) {
          return winner;
        }
      }

      throw error;
    }
  }

  async getRiskProfile(userId: string): Promise<RiskProfile> {
    const rows = await this.database
      .select()
      .from(finappRiskProfile)
      .where(eq(finappRiskProfile.userId, userId))
      .limit(1);
    const row = rows[0];
    if (row === undefined) throw new Error('Risk profile is missing.');
    return this.profile(row);
  }

  async updateRiskProfile(
    userId: string,
    input: RiskProfileUpdate,
  ): Promise<RiskProfile | undefined> {
    const expectedVersion = BigInt(input.expectedVersion);
    const rows = await this.database
      .update(finappRiskProfile)
      .set({
        riskLevel: input.riskLevel,
        investmentHorizonMonths: input.investmentHorizonMonths,
        monthlyContribution: input.monthlyContribution,
        version: sql`${finappRiskProfile.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(finappRiskProfile.userId, userId),
          eq(finappRiskProfile.version, expectedVersion),
        ),
      )
      .returning();
    const row = rows[0];
    return row === undefined ? undefined : this.profile(row);
  }

  private async findByExternalIdentity(
    issuer: string,
    subject: string,
    database: IdentityDatabase = this.database,
  ): Promise<CurrentUser | undefined> {
    const rows = await database
      .select({
        userId: finappAppUser.id,
        displayName: finappAppUser.displayName,
        riskProfile: finappRiskProfile.riskLevel,
        datasetVersion: finappAppUser.datasetVersion,
        syntheticData: finappAppUser.syntheticData,
      })
      .from(finappOidcIdentity)
      .innerJoin(finappAppUser, eq(finappOidcIdentity.userId, finappAppUser.id))
      .innerJoin(
        finappRiskProfile,
        eq(finappRiskProfile.userId, finappAppUser.id),
      )
      .where(
        and(
          eq(finappOidcIdentity.issuer, issuer),
          eq(finappOidcIdentity.subject, subject),
        ),
      )
      .limit(1);
    const row = rows[0];

    if (row === undefined) {
      return undefined;
    }

    return {
      userId: row.userId,
      displayName: row.displayName,
      riskProfile: row.riskProfile as RiskLevel,
      datasetVersion: row.datasetVersion,
      syntheticData: row.syntheticData as true,
    };
  }

  private profile(row: typeof finappRiskProfile.$inferSelect): RiskProfile {
    return {
      riskLevel: row.riskLevel as RiskLevel,
      investmentHorizonMonths: row.investmentHorizonMonths,
      monthlyContribution: row.monthlyContribution,
      version: row.version.toString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
