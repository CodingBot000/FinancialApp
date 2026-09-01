import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  BrokerageTransportError,
  type BrokeragePort,
} from '../../application/ports/brokerage.port.js';
import type { ExternalOrderResult } from '../../domain/trading-model.js';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function parse(value: unknown): ExternalOrderResult {
  const item = record(value);
  if (
    item === undefined ||
    typeof item.clientOrderId !== 'string' ||
    typeof item.externalOrderId !== 'string' ||
    !['FILLED', 'REJECTED', 'UNKNOWN'].includes(String(item.status)) ||
    typeof item.quantity !== 'string' ||
    !/^\d+\.\d{8}$/.test(item.quantity) ||
    !(
      item.unitPrice === null ||
      (typeof item.unitPrice === 'string' &&
        /^\d+\.\d{4}$/.test(item.unitPrice))
    ) ||
    !(
      item.filledAmount === null ||
      (typeof item.filledAmount === 'string' &&
        /^\d+\.\d{4}$/.test(item.filledAmount))
    ) ||
    !(
      item.executedAt === null ||
      (typeof item.executedAt === 'string' &&
        Number.isFinite(Date.parse(item.executedAt)))
    )
  ) {
    throw new BrokerageTransportError('INVALID_RESPONSE');
  }
  return item as unknown as ExternalOrderResult;
}

function timeoutMilliseconds(): number {
  const configured = Number.parseInt(
    process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS ?? '5000',
    10,
  );
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 5000;
}

@Injectable()
export class SimulatorBrokerageAdapter implements BrokeragePort {
  async submit(input: {
    readonly clientOrderId: string;
    readonly accountId: string;
    readonly instrumentId: string;
    readonly quantity: string;
  }): Promise<ExternalOrderResult> {
    return this.request('/sim/v1/brokerage/orders', {
      method: 'POST',
      body: JSON.stringify({ ...input, side: 'BUY' }),
    });
  }

  async find(clientOrderId: string): Promise<ExternalOrderResult> {
    return this.request(
      `/sim/v1/brokerage/orders/by-client-order-id/${encodeURIComponent(clientOrderId)}`,
      { method: 'GET' },
    );
  }

  private async request(
    path: string,
    init: RequestInit,
  ): Promise<ExternalOrderResult> {
    const baseUrl =
      process.env.INSTITUTION_SIMULATOR_BASE_URL ?? 'http://127.0.0.1:8082';
    const requestId = randomUUID();
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': requestId,
          'x-request-id': requestId,
        },
        signal: AbortSignal.timeout(timeoutMilliseconds()),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new BrokerageTransportError('TIMEOUT');
      }
      throw new BrokerageTransportError('HTTP_ERROR');
    }
    if (!response.ok) throw new BrokerageTransportError('HTTP_ERROR');
    try {
      return parse(await response.json());
    } catch (error) {
      if (error instanceof BrokerageTransportError) throw error;
      throw new BrokerageTransportError('INVALID_RESPONSE');
    }
  }
}
