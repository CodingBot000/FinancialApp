import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { MarketPricePort } from '../../application/ports/market-price.port.js';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class SimulatorMarketPriceAdapter implements MarketPricePort {
  async price(instrumentCode: string): Promise<string> {
    const baseUrl =
      process.env.INSTITUTION_SIMULATOR_BASE_URL ??
      'http://institution-simulator:8080';
    const timeoutMilliseconds = Number.parseInt(
      process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS ?? '5000',
      10,
    );
    const requestId = randomUUID();
    const url = new URL('/sim/v1/market/prices', baseUrl);
    url.searchParams.set('instrumentIds', instrumentCode);
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'x-correlation-id': requestId,
        'x-request-id': requestId,
      },
      signal: AbortSignal.timeout(timeoutMilliseconds),
    });
    if (!response.ok) {
      throw new Error(
        `Simulator market request failed with HTTP ${response.status}.`,
      );
    }
    const body: unknown = await response.json();
    if (
      !isRecord(body) ||
      body.schemaVersion !== 'simulator-v1' ||
      !Array.isArray(body.items) ||
      body.items.length !== 1 ||
      !isRecord(body.items[0]) ||
      body.items[0].instrumentId !== instrumentCode ||
      body.items[0].currency !== 'KRW' ||
      typeof body.items[0].price !== 'string' ||
      !/^[0-9]+\.[0-9]{4}$/.test(body.items[0].price) ||
      Number(body.items[0].price) <= 0
    ) {
      throw new Error('Simulator market price response is invalid.');
    }
    return body.items[0].price;
  }
}
