import { Inject, Injectable } from '@nestjs/common';

import {
  MARKET_DATA_PROVIDER,
  type MarketDataProvider,
} from './ports/market-data-provider.port.js';
import {
  MARKET_REPOSITORY,
  type MarketRepository,
} from './ports/market-repository.port.js';
import {
  MarketDataInvalidError,
  MarketProviderUnavailableError,
  MarketRateLimitedError,
  MarketStockNotFoundError,
} from '../domain/market-errors.js';
import type {
  MarketBars,
  MarketBar,
  MarketInterval,
  MarketQuote,
  MarketStock,
} from '../domain/market-model.js';
import { MARKET_BAR_LIMITS } from '../domain/market-model.js';
import { deduplicateMarketBars } from '../domain/market-bucket.js';

const DEFAULT_QUOTE_FRESH_MS = 30_000;
const DEFAULT_BAR_FRESH_MS = 5 * 60_000;
@Injectable()
export class MarketService {
  private readonly quoteRequests = new Map<string, Promise<MarketQuote>>();
  private readonly barRequests = new Map<string, Promise<MarketBars>>();
  private readonly barRefreshAt = new Map<string, number>();

  constructor(
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
    @Inject(MARKET_REPOSITORY)
    private readonly repository: MarketRepository,
  ) {}

  searchStocks(query: string, limit: number): Promise<readonly MarketStock[]> {
    return this.repository.searchStocks(query, limit);
  }

  async quote(symbol: string): Promise<MarketQuote> {
    const stock = await this.requireStock(symbol);
    const cached = await this.repository.latestQuote(symbol);
    if (cached !== undefined && isFresh(cached.capturedAt, quoteFreshMs())) {
      return { ...cached, freshness: 'FRESH' };
    }

    const active = this.quoteRequests.get(symbol);
    if (active !== undefined) return active;
    const request = this.refreshQuote(stock, cached).finally(() => {
      this.quoteRequests.delete(symbol);
    });
    this.quoteRequests.set(symbol, request);
    return request;
  }

  async bars(symbol: string, interval: MarketInterval): Promise<MarketBars> {
    const stock = await this.requireStock(symbol);
    const key = `${symbol}:${interval}`;
    const cached = await this.repository.listBars(
      symbol,
      interval,
      MARKET_BAR_LIMITS[interval],
    );
    const normalizedCache = deduplicateMarketBars(cached, interval);
    if (this.isBarCacheFresh(key, normalizedCache)) {
      return {
        symbol,
        interval,
        source: this.source(),
        freshness: 'FRESH',
        bars: normalizedCache,
      };
    }

    const active = this.barRequests.get(key);
    if (active !== undefined) return active;
    const request = this.refreshBars(
      stock,
      interval,
      normalizedCache,
      key,
    ).finally(() => {
      this.barRequests.delete(key);
    });
    this.barRequests.set(key, request);
    return request;
  }

  async syncInstruments(): Promise<number> {
    return this.repository.upsertInstruments(
      await this.provider.syncInstruments(),
    );
  }

  private async refreshQuote(
    stock: MarketStock,
    cached: MarketQuote | undefined,
  ): Promise<MarketQuote> {
    try {
      return await this.repository.saveQuote(await this.provider.quote(stock));
    } catch (error) {
      if (cached !== undefined && isRecoverableMarketError(error)) {
        return { ...cached, freshness: 'STALE' };
      }
      throw error;
    }
  }

  private async refreshBars(
    stock: MarketStock,
    interval: MarketInterval,
    cached: readonly MarketBar[],
    key: string,
  ): Promise<MarketBars> {
    try {
      const result = await this.provider.bars(stock, interval);
      const normalizedBars = deduplicateMarketBars(result.bars, interval);
      await this.repository.upsertBars(
        stock.symbol,
        interval,
        normalizedBars,
        result.source,
      );
      this.barRefreshAt.set(key, Date.now());
      return {
        symbol: stock.symbol,
        interval,
        source: result.source,
        freshness: 'FRESH',
        bars: deduplicateMarketBars(
          await this.repository.listBars(
            stock.symbol,
            interval,
            MARKET_BAR_LIMITS[interval],
          ),
          interval,
        ),
      };
    } catch (error) {
      if (cached.length > 0 && isRecoverableMarketError(error)) {
        return {
          symbol: stock.symbol,
          interval,
          source: this.source(),
          freshness: 'STALE',
          bars: cached,
        };
      }
      throw error;
    }
  }

  private async requireStock(symbol: string): Promise<MarketStock> {
    const normalized = symbol.trim();
    if (!/^\d{6}$/.test(normalized)) {
      throw new MarketStockNotFoundError('Market stock symbol is invalid.');
    }
    const stock = await this.repository.findStock(normalized);
    if (stock === undefined) {
      throw new MarketStockNotFoundError('Market stock was not found.');
    }
    return stock;
  }

  private isBarCacheFresh(key: string, bars: readonly unknown[]): boolean {
    return (
      bars.length > 0 &&
      (this.barRefreshAt.get(key) ?? 0) + barFreshMs() > Date.now()
    );
  }

  private source(): 'KIS' | 'LOCAL' {
    return process.env.MARKET_DATA_PROVIDER?.toUpperCase() === 'KIS'
      ? 'KIS'
      : 'LOCAL';
  }
}

function quoteFreshMs(): number {
  return configuredMilliseconds(
    'MARKET_QUOTE_FRESH_SECONDS',
    DEFAULT_QUOTE_FRESH_MS / 1000,
  );
}

function barFreshMs(): number {
  return configuredMilliseconds(
    'MARKET_BAR_FRESH_SECONDS',
    DEFAULT_BAR_FRESH_MS / 1000,
  );
}

function configuredMilliseconds(name: string, fallbackSeconds: number): number {
  const seconds = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 86_400
    ? seconds * 1000
    : fallbackSeconds * 1000;
}

function isFresh(value: string, maxAgeMs: number): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs;
}

function isRecoverableMarketError(error: unknown): boolean {
  return (
    error instanceof MarketProviderUnavailableError ||
    error instanceof MarketRateLimitedError ||
    error instanceof MarketDataInvalidError
  );
}
