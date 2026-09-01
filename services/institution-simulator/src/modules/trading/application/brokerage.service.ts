import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { ScenarioService } from '../../scenario/application/scenario.service.js';
import {
  BROKERAGE_REPOSITORY,
  type BrokerageRepository,
} from './ports/brokerage-repository.port.js';
import type {
  BrokerageOrderRequest,
  BrokerageOrderView,
} from '../domain/brokerage-order.js';

export class BrokerageInputError extends Error {}
export class BrokerageConflictError extends Error {}
export class BrokerageNotFoundError extends Error {}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class BrokerageService {
  constructor(
    @Inject(BROKERAGE_REPOSITORY)
    private readonly repository: BrokerageRepository,
    @Inject(ScenarioService)
    private readonly scenarioService: ScenarioService,
  ) {}

  async find(clientOrderId: string): Promise<BrokerageOrderView> {
    if (!this.uuid(clientOrderId)) throw new BrokerageInputError();
    const order = await this.repository.find(clientOrderId);
    if (order === undefined) throw new BrokerageNotFoundError();
    return order;
  }

  async submit(
    request: unknown,
  ): Promise<
    | { readonly created: boolean; readonly order: BrokerageOrderView }
    | { malformed: true }
  > {
    const input = this.validate(request);
    if ((await this.scenarioService.beforeRead()) === 'MALFORMED_RESPONSE') {
      return { malformed: true };
    }
    const hash = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const result = await this.repository.submit(
      input,
      hash,
      await this.scenarioService.current(),
    );
    if (result.kind === 'conflict') throw new BrokerageConflictError();
    if (result.kind === 'not_found') throw new BrokerageNotFoundError();
    return { created: result.created, order: result.order };
  }

  private uuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private validate(value: unknown): BrokerageOrderRequest {
    if (
      !isRecord(value) ||
      typeof value.clientOrderId !== 'string' ||
      !this.uuid(value.clientOrderId) ||
      typeof value.accountId !== 'string' ||
      value.accountId.length === 0 ||
      typeof value.instrumentId !== 'string' ||
      value.instrumentId.length === 0 ||
      value.side !== 'BUY' ||
      typeof value.quantity !== 'string' ||
      !/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value.quantity) ||
      Number(value.quantity) <= 0
    ) {
      throw new BrokerageInputError();
    }
    const [whole = '0', fraction = ''] = value.quantity.split('.');
    return {
      clientOrderId: value.clientOrderId,
      accountId: value.accountId,
      instrumentId: value.instrumentId,
      side: 'BUY',
      quantity: `${whole}.${fraction.padEnd(8, '0')}`,
    };
  }
}
