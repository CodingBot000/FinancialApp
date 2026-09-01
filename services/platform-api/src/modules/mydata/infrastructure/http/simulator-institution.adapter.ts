import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { CircuitBreaker } from '../../../../core/resilience/circuit-breaker.js';
import type { InstitutionPort } from '../../application/ports/institution.port.js';
import type {
  InstitutionAccount,
  InstitutionDataset,
  InstitutionHolding,
  InstitutionPage,
  InstitutionTransaction,
} from '../../domain/institution-data.js';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Simulator response field ${key} is invalid.`);
  }
  return value;
}

function account(value: unknown): InstitutionAccount {
  if (!isRecord(value)) throw new Error('Simulator account is invalid.');
  return {
    externalAccountId: requiredString(value, 'externalAccountId'),
    maskedAccountNumber: requiredString(value, 'maskedAccountNumber'),
    accountType: requiredString(value, 'accountType'),
    currency: requiredString(value, 'currency'),
    cashBalance: requiredString(value, 'cashBalance'),
    status: requiredString(value, 'status'),
  };
}

function holding(value: unknown): InstitutionHolding {
  if (!isRecord(value)) throw new Error('Simulator holding is invalid.');
  return {
    externalAccountId: requiredString(value, 'externalAccountId'),
    externalHoldingId: requiredString(value, 'externalHoldingId'),
    instrumentCode: requiredString(value, 'instrumentCode'),
    displayName: requiredString(value, 'displayName'),
    assetClass: requiredString(value, 'assetClass'),
    quantity: requiredString(value, 'quantity'),
    averagePrice: requiredString(value, 'averagePrice'),
    asOfAt: requiredString(value, 'asOfAt'),
  };
}

function transaction(value: unknown): InstitutionTransaction {
  if (!isRecord(value)) throw new Error('Simulator transaction is invalid.');
  return {
    externalAccountId: requiredString(value, 'externalAccountId'),
    externalTransactionId: requiredString(value, 'externalTransactionId'),
    transactionType: requiredString(value, 'transactionType'),
    amount: requiredString(value, 'amount'),
    currency: requiredString(value, 'currency'),
    occurredAt: requiredString(value, 'occurredAt'),
  };
}

@Injectable()
export class SimulatorInstitutionAdapter implements InstitutionPort {
  private readonly circuit = new CircuitBreaker('simulator-mydata');

  async fetchDataset(externalCustomerId: string): Promise<InstitutionDataset> {
    const customerPath = encodeURIComponent(externalCustomerId);
    const [accounts, holdings, transactions] = await Promise.all([
      this.fetchPage(
        `/sim/v1/mydata/customers/${customerPath}/accounts`,
        account,
      ),
      this.fetchPage(
        `/sim/v1/mydata/customers/${customerPath}/holdings`,
        holding,
      ),
      this.fetchPage(
        `/sim/v1/mydata/customers/${customerPath}/transactions`,
        transaction,
      ),
    ]);

    return { accounts, holdings, transactions };
  }

  private async fetchPage<T>(
    path: string,
    parseItem: (value: unknown) => T,
  ): Promise<InstitutionPage<T>> {
    return this.circuit.execute(() =>
      this.fetchPageWithoutRetry(path, parseItem),
    );
  }

  private async fetchPageWithoutRetry<T>(
    path: string,
    parseItem: (value: unknown) => T,
  ): Promise<InstitutionPage<T>> {
    const baseUrl =
      process.env.INSTITUTION_SIMULATOR_BASE_URL ??
      'http://institution-simulator:8080';
    const requestId = randomUUID();
    const timeoutMilliseconds = Number.parseInt(
      process.env.INSTITUTION_SIMULATOR_TIMEOUT_MS ?? '5000',
      10,
    );
    const response = await fetch(new URL(path, baseUrl), {
      headers: {
        accept: 'application/json',
        'x-correlation-id': requestId,
        'x-request-id': requestId,
      },
      signal: AbortSignal.timeout(timeoutMilliseconds),
    });

    if (!response.ok) {
      throw new Error(`Simulator request failed with HTTP ${response.status}.`);
    }

    const body: unknown = await response.json();
    if (
      !isRecord(body) ||
      body.schemaVersion !== 'simulator-v1' ||
      !Array.isArray(body.items) ||
      body.nextCursor !== null
    ) {
      throw new Error('Simulator page envelope is invalid.');
    }

    return {
      schemaVersion: 'simulator-v1',
      items: body.items.map(parseItem),
      nextCursor: null,
      requestId: response.headers.get('x-request-id') ?? requestId,
    };
  }
}
