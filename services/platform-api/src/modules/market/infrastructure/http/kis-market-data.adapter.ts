import { Injectable } from '@nestjs/common';

import {
  MARKET_BAR_LIMITS,
  MARKET_INTERVALS,
  type MarketBar,
  type MarketInterval,
  type MarketQuote,
  type MarketStock,
} from '../../domain/market-model.js';
import { deduplicateMarketBars } from '../../domain/market-bucket.js';
import {
  MarketDataInvalidError,
  MarketProviderUnavailableError,
  MarketRateLimitedError,
} from '../../domain/market-errors.js';
import type { MarketDataProvider } from '../../application/ports/market-data-provider.port.js';
import { fetchKisStockMaster } from './kis-stock-master.js';

const KIS_ENDPOINTS = {
  price: {
    path: '/uapi/domestic-stock/v1/quotations/inquire-price',
    trId: 'FHKST01010100',
  },
  minuteBars: {
    path: '/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice',
    trId: 'FHKST03010200',
  },
  dailyBars: {
    path: '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
    trId: 'FHKST03010100',
  },
} as const;

type JsonRecord = Record<string, unknown>;
type KisResponse = JsonRecord & {
  rt_cd?: string;
  msg1?: string;
  output?: unknown;
  output2?: unknown;
};
type QueryParams = Readonly<Record<string, string | undefined>>;

interface TokenCache {
  readonly accessToken: string;
  readonly expiresAt: number;
}

@Injectable()
export class KisMarketDataAdapter implements MarketDataProvider {
  private tokenCache: TokenCache | undefined;
  private tokenRequest: Promise<string> | undefined;

  async quote(stock: MarketStock): Promise<Omit<MarketQuote, 'freshness'>> {
    const response = await this.get(KIS_ENDPOINTS.price, {
      FID_COND_MRKT_DIV_CODE: 'J',
      FID_INPUT_ISCD: stock.symbol,
    });
    const output = record(response.output);
    const currentPrice = decimal(output?.stck_prpr);
    const changePrice = decimal(output?.prdy_vrss);
    const changeRate = decimal(output?.prdy_ctrt);
    const volume = integer(output?.acml_vol);
    if (
      currentPrice === undefined ||
      changePrice === undefined ||
      changeRate === undefined ||
      volume === undefined ||
      Number(currentPrice) <= 0
    ) {
      throw new MarketDataInvalidError('KIS current quote is invalid.');
    }
    return {
      ...stock,
      currency: 'KRW',
      currentPrice,
      changePrice,
      changeRate,
      volume,
      capturedAt: new Date().toISOString(),
      source: 'KIS',
    };
  }

  async bars(
    stock: MarketStock,
    interval: MarketInterval,
  ): Promise<{ readonly bars: readonly MarketBar[]; readonly source: 'KIS' }> {
    if (!MARKET_INTERVALS.includes(interval)) {
      throw new MarketDataInvalidError('Market interval is invalid.');
    }
    const response =
      interval === 'MINUTE'
        ? await this.get(KIS_ENDPOINTS.minuteBars, {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: stock.symbol,
            FID_INPUT_HOUR_1: currentKstTime(),
            FID_PW_DATA_INCU_YN: 'Y',
            FID_ETC_CLS_CODE: '',
          })
        : await this.get(KIS_ENDPOINTS.dailyBars, {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: stock.symbol,
            FID_INPUT_DATE_1: compactKstDate(daysAgo(interval)),
            FID_INPUT_DATE_2: compactKstDate(new Date()),
            FID_PERIOD_DIV_CODE: periodCode(interval),
            FID_ORG_ADJ_PRC: '0',
          });
    const rows = Array.isArray(response.output2) ? response.output2 : [];
    const bars = deduplicateMarketBars(
      rows
        .map((value) => normalizeBar(value, interval))
        .filter((value): value is MarketBar => value !== undefined),
      interval,
    );
    if (rows.length > 0 && bars.length === 0) {
      throw new MarketDataInvalidError('KIS chart response is invalid.');
    }
    return { bars: bars.slice(-MARKET_BAR_LIMITS[interval]), source: 'KIS' };
  }

  syncInstruments() {
    return fetchKisStockMaster();
  }

  private async get(
    endpoint: { readonly path: string; readonly trId: string },
    params: QueryParams,
  ): Promise<KisResponse> {
    const accessToken = await this.getAccessToken();
    const url = new URL(endpoint.path, this.baseUrl());
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          accept: 'application/json',
          appkey: this.required('KIS_APP_KEY'),
          appsecret: this.required('KIS_APP_SECRET'),
          authorization: `Bearer ${accessToken}`,
          custtype: 'P',
          'content-type': 'application/json; charset=utf-8',
          tr_id: endpoint.trId,
        },
        signal: AbortSignal.timeout(this.timeoutMs()),
      });
    } catch (cause) {
      throw new MarketProviderUnavailableError('KIS market request failed.', {
        cause,
      });
    }
    const body = await json(response);
    if (response.status === 429) {
      throw new MarketRateLimitedError('KIS market rate limit was reached.');
    }
    if (!response.ok || (body.rt_cd !== undefined && body.rt_cd !== '0')) {
      throw new MarketProviderUnavailableError(
        'KIS market provider is unavailable.',
      );
    }
    return body;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (
      this.tokenCache !== undefined &&
      this.tokenCache.expiresAt - 60_000 > now
    ) {
      return this.tokenCache.accessToken;
    }
    if (this.tokenRequest !== undefined) return this.tokenRequest;
    this.tokenRequest = this.requestAccessToken().finally(() => {
      this.tokenRequest = undefined;
    });
    return this.tokenRequest;
  }

  private async requestAccessToken(): Promise<string> {
    const appKey = this.required('KIS_APP_KEY');
    const appSecret = this.required('KIS_APP_SECRET');
    let response: Response;
    try {
      response = await fetch(new URL('/oauth2/tokenP', this.baseUrl()), {
        body: JSON.stringify({
          grant_type: 'client_credentials',
          appkey: appKey,
          appsecret: appSecret,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        signal: AbortSignal.timeout(this.timeoutMs()),
      });
    } catch (cause) {
      throw new MarketProviderUnavailableError('KIS token request failed.', {
        cause,
      });
    }
    const body = await json(response);
    const accessToken =
      typeof body.access_token === 'string' ? body.access_token : undefined;
    if (!response.ok || accessToken === undefined || accessToken.length === 0) {
      throw new MarketProviderUnavailableError('KIS token was not returned.');
    }
    const expiresIn =
      typeof body.expires_in === 'number' ? body.expires_in : 86_400;
    this.tokenCache = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return accessToken;
  }

  private baseUrl(): string {
    return (
      process.env.KIS_BASE_URL ?? 'https://openapi.koreainvestment.com:9443'
    );
  }

  private timeoutMs(): number {
    const value = Number.parseInt(
      process.env.KIS_HTTP_TIMEOUT_MS ?? '5000',
      10,
    );
    return Number.isFinite(value) && value >= 1000 && value <= 30_000
      ? value
      : 5000;
  }

  private required(name: string): string {
    const value = process.env[name]?.trim();
    if (value === undefined || value.length === 0) {
      throw new MarketProviderUnavailableError(`${name} is not configured.`);
    }
    return value;
  }
}

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

async function json(response: Response): Promise<KisResponse> {
  try {
    const value: unknown = await response.json();
    return record(value) ?? {};
  } catch (cause) {
    throw new MarketDataInvalidError('KIS response is not valid JSON.', {
      cause,
    });
  }
}

function decimal(value: unknown): string | undefined {
  const text = String(value ?? '')
    .replaceAll(',', '')
    .trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return undefined;
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  return `${negative ? '-' : ''}${whole}.${fraction.padEnd(4, '0').slice(0, 4)}`;
}

function integer(value: unknown): string | undefined {
  const text = String(value ?? '')
    .replaceAll(',', '')
    .trim();
  return /^\d+$/.test(text) ? text : undefined;
}

function normalizeBar(
  value: unknown,
  interval: MarketInterval,
): MarketBar | undefined {
  const row = record(value);
  const date =
    typeof row?.stck_bsop_date === 'string' ? row.stck_bsop_date : undefined;
  const time =
    typeof row?.stck_cntg_hour === 'string' ? row.stck_cntg_hour : undefined;
  const bucketAt =
    interval === 'MINUTE' ? kstDateTime(date, time) : kstDate(date);
  const open = decimal(row?.stck_oprc);
  const high = decimal(row?.stck_hgpr);
  const low = decimal(row?.stck_lwpr);
  const close = decimal(
    interval === 'MINUTE' ? row?.stck_prpr : row?.stck_clpr,
  );
  const volume = integer(row?.cntg_vol ?? row?.acml_vol);
  if (
    bucketAt === undefined ||
    open === undefined ||
    high === undefined ||
    low === undefined ||
    close === undefined ||
    volume === undefined ||
    Number(high) < Number(low)
  ) {
    return undefined;
  }
  return { bucketAt, open, high, low, close, volume };
}

function periodCode(interval: Exclude<MarketInterval, 'MINUTE'>): string {
  return { DAILY: 'D', WEEKLY: 'W', MONTHLY: 'M', YEARLY: 'Y' }[interval];
}

function daysAgo(interval: Exclude<MarketInterval, 'MINUTE'>): Date {
  const date = new Date();
  const days = {
    DAILY: 180,
    WEEKLY: 365 * 5,
    MONTHLY: 365 * 10,
    YEARLY: 365 * 30,
  }[interval];
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function currentKstTime(): string {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}`;
}

function compactKstDate(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function kstDate(value: string | undefined): string | undefined {
  if (value === undefined || !/^\d{8}$/.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month, day));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function kstDateTime(
  dateValue: string | undefined,
  timeValue: string | undefined,
): string | undefined {
  if (dateValue === undefined || !/^\d{8}$/.test(dateValue)) return undefined;
  if (timeValue === undefined || !/^\d{6}/.test(timeValue))
    return kstDate(dateValue);
  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(4, 6)) - 1;
  const day = Number(dateValue.slice(6, 8));
  const hour = Number(timeValue.slice(0, 2));
  const minute = Number(timeValue.slice(2, 4));
  const second = Number(timeValue.slice(4, 6));
  const timestamp =
    Date.UTC(year, month, day, hour, minute, second) - 9 * 60 * 60 * 1000;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
