import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { PLATFORM_DATABASE_POOL } from '../../../../core/database/database.tokens.js';
import {
  finappMarketInstrument,
  finappMarketPriceBar,
  finappMarketQuoteSnapshot,
} from '../../../../database/schema.js';
import type { MarketRepository } from '../../application/ports/market-repository.port.js';
import type {
  MarketBar,
  MarketInterval,
  MarketInstrumentInput,
  MarketQuote,
  MarketStock,
  MarketSource,
} from '../../domain/market-model.js';
import { deduplicateMarketBars } from '../../domain/market-bucket.js';

const schema = {
  finappMarketInstrument,
  finappMarketPriceBar,
  finappMarketQuoteSnapshot,
};

type Database = NodePgDatabase<typeof schema>;

@Injectable()
export class DrizzleMarketRepository implements MarketRepository {
  private readonly database: Database;

  constructor(@Inject(PLATFORM_DATABASE_POOL) pool: Pool) {
    this.database = drizzle(pool, { schema });
  }

  async searchStocks(
    query: string,
    limit: number,
  ): Promise<readonly MarketStock[]> {
    const normalizedQuery = escapeLike(query.trim());
    const rows = await this.database
      .select({
        symbol: finappMarketInstrument.symbol,
        name: finappMarketInstrument.name,
        market: finappMarketInstrument.market,
        industry: finappMarketInstrument.industry,
      })
      .from(finappMarketInstrument)
      .where(
        and(
          eq(finappMarketInstrument.active, true),
          or(
            ilike(finappMarketInstrument.symbol, `${normalizedQuery}%`),
            ilike(finappMarketInstrument.name, `%${normalizedQuery}%`),
          ),
        ),
      )
      .orderBy(
        asc(finappMarketInstrument.market),
        asc(finappMarketInstrument.symbol),
      )
      .limit(limit);
    return rows.map(stockView);
  }

  async findStock(symbol: string): Promise<MarketStock | undefined> {
    const rows = await this.database
      .select({
        symbol: finappMarketInstrument.symbol,
        name: finappMarketInstrument.name,
        market: finappMarketInstrument.market,
        industry: finappMarketInstrument.industry,
      })
      .from(finappMarketInstrument)
      .where(
        and(
          eq(finappMarketInstrument.symbol, symbol),
          eq(finappMarketInstrument.active, true),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? undefined : stockView(row);
  }

  async latestQuote(symbol: string): Promise<MarketQuote | undefined> {
    const rows = await this.database
      .select({
        symbol: finappMarketInstrument.symbol,
        name: finappMarketInstrument.name,
        market: finappMarketInstrument.market,
        industry: finappMarketInstrument.industry,
        currency: sql<'KRW'>`'KRW'`,
        currentPrice: finappMarketQuoteSnapshot.currentPrice,
        changePrice: finappMarketQuoteSnapshot.changePrice,
        changeRate: finappMarketQuoteSnapshot.changeRate,
        volume: finappMarketQuoteSnapshot.volume,
        capturedAt: finappMarketQuoteSnapshot.capturedAt,
        source: finappMarketQuoteSnapshot.source,
      })
      .from(finappMarketQuoteSnapshot)
      .innerJoin(
        finappMarketInstrument,
        eq(finappMarketInstrument.id, finappMarketQuoteSnapshot.instrumentId),
      )
      .where(
        and(
          eq(finappMarketInstrument.symbol, symbol),
          eq(finappMarketInstrument.active, true),
        ),
      )
      .orderBy(desc(finappMarketQuoteSnapshot.capturedAt))
      .limit(1);
    const row = rows[0];
    if (row === undefined) return undefined;
    return {
      ...stockView(row),
      currency: 'KRW',
      currentPrice: row.currentPrice,
      changePrice: row.changePrice,
      changeRate: row.changeRate,
      volume: row.volume.toString(),
      capturedAt: row.capturedAt.toISOString(),
      source: row.source as MarketSource,
      freshness: 'FRESH',
    };
  }

  async saveQuote(quote: Omit<MarketQuote, 'freshness'>): Promise<MarketQuote> {
    const instrument = await this.findInstrumentId(quote.symbol);
    if (instrument === undefined) {
      throw new Error('Market instrument is not available.');
    }
    const capturedAt = new Date(quote.capturedAt);
    const id = randomUUID();
    await this.database.insert(finappMarketQuoteSnapshot).values({
      id,
      instrumentId: instrument.id,
      currentPrice: quote.currentPrice,
      changePrice: quote.changePrice,
      changeRate: quote.changeRate,
      volume: BigInt(quote.volume),
      source: quote.source,
      capturedAt,
      raw: {},
    });
    return { ...quote, freshness: 'FRESH' };
  }

  async listBars(
    symbol: string,
    interval: MarketInterval,
    limit: number,
  ): Promise<readonly MarketBar[]> {
    const instrument = await this.findInstrumentId(symbol);
    if (instrument === undefined) return [];
    const rows = await this.database
      .select({
        bucketAt: finappMarketPriceBar.bucketAt,
        open: finappMarketPriceBar.open,
        high: finappMarketPriceBar.high,
        low: finappMarketPriceBar.low,
        close: finappMarketPriceBar.close,
        volume: finappMarketPriceBar.volume,
      })
      .from(finappMarketPriceBar)
      .where(
        and(
          eq(finappMarketPriceBar.instrumentId, instrument.id),
          eq(finappMarketPriceBar.interval, interval),
        ),
      )
      .orderBy(desc(finappMarketPriceBar.bucketAt))
      .limit(Math.min(limit * 8, 1000));
    return deduplicateMarketBars(
      rows.reverse().map((row) => ({
        bucketAt: row.bucketAt.toISOString(),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume.toString(),
      })),
      interval,
    ).slice(-limit);
  }

  async upsertBars(
    symbol: string,
    interval: MarketInterval,
    bars: readonly MarketBar[],
    source: MarketSource,
  ): Promise<void> {
    const instrument = await this.findInstrumentId(symbol);
    if (instrument === undefined) {
      throw new Error('Market instrument is not available.');
    }
    for (const bar of deduplicateMarketBars(bars, interval)) {
      await this.database
        .insert(finappMarketPriceBar)
        .values({
          id: randomUUID(),
          instrumentId: instrument.id,
          interval,
          bucketAt: new Date(bar.bucketAt),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: BigInt(bar.volume),
          source,
          raw: {},
        })
        .onConflictDoUpdate({
          target: [
            finappMarketPriceBar.instrumentId,
            finappMarketPriceBar.interval,
            finappMarketPriceBar.bucketAt,
          ],
          set: {
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: BigInt(bar.volume),
            source,
            raw: {},
          },
        });
    }
  }

  async upsertInstruments(
    instruments: readonly MarketInstrumentInput[],
  ): Promise<number> {
    const syncedAt = new Date();
    for (const instrument of instruments) {
      await this.database
        .insert(finappMarketInstrument)
        .values({
          id: randomUUID(),
          symbol: instrument.symbol,
          name: instrument.name,
          market: instrument.market,
          industry: instrument.industry ?? null,
          standardCode: instrument.standardCode ?? null,
          basePrice: instrument.basePrice ?? null,
          listedAt: instrument.listedAt ?? null,
          active: true,
          source: 'KIS_MASTER',
          raw: instrument.raw,
          syncedAt,
          updatedAt: syncedAt,
        })
        .onConflictDoUpdate({
          target: finappMarketInstrument.symbol,
          set: {
            name: instrument.name,
            market: instrument.market,
            industry: instrument.industry ?? null,
            standardCode: instrument.standardCode ?? null,
            basePrice: instrument.basePrice ?? null,
            listedAt: instrument.listedAt ?? null,
            active: true,
            source: 'KIS_MASTER',
            raw: instrument.raw,
            syncedAt,
            updatedAt: syncedAt,
          },
        });
    }
    return instruments.length;
  }

  private async findInstrumentId(
    symbol: string,
  ): Promise<{ readonly id: string } | undefined> {
    const rows = await this.database
      .select({ id: finappMarketInstrument.id })
      .from(finappMarketInstrument)
      .where(
        and(
          eq(finappMarketInstrument.symbol, symbol),
          eq(finappMarketInstrument.active, true),
        ),
      )
      .limit(1);
    return rows[0];
  }
}

function stockView(row: {
  readonly symbol: string;
  readonly name: string;
  readonly market: string;
  readonly industry: string | null;
}): MarketStock {
  return {
    symbol: row.symbol,
    name: row.name,
    market: row.market as MarketStock['market'],
    industry: row.industry,
  };
}

function escapeLike(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}
