import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
} from '@nestjs/common';

import { simulatorProblem } from '../../core/http/simulator-problem.js';
import { ScenarioService } from '../scenario/application/scenario.service.js';
import { MarketRepository } from './market.repository.js';

@Controller('/sim/v1/market')
export class MarketController {
  constructor(
    @Inject(MarketRepository)
    private readonly repository: MarketRepository,
    @Inject(ScenarioService)
    private readonly scenarioService: ScenarioService,
  ) {}

  @Get('/instruments')
  async instruments() {
    if ((await this.scenarioService.beforeRead()) === 'MALFORMED_RESPONSE') {
      return { malformed: true };
    }
    return {
      schemaVersion: 'simulator-v1',
      items: await this.repository.instruments(),
    };
  }

  @Get('/prices')
  async prices(@Query('instrumentIds') instrumentIds?: string) {
    const ids = (instrumentIds ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (ids.length === 0 || ids.length > 20) {
      throw new BadRequestException(
        simulatorProblem(
          400,
          'VALIDATION_FAILED',
          'instrumentIds is required.',
        ),
      );
    }
    if ((await this.scenarioService.beforeRead()) === 'MALFORMED_RESPONSE') {
      return { items: 'invalid' };
    }
    return {
      schemaVersion: 'simulator-v1',
      items: (await this.repository.prices(ids)).map((item) => ({
        ...item,
        asOfAt: item.asOfAt.toISOString(),
      })),
    };
  }

  @Get('/history')
  async history(
    @Query('instrumentId') instrumentId?: string,
    @Query('range') range?: string,
  ) {
    if (
      instrumentId === undefined ||
      !['1M', '3M', '1Y', 'ALL'].includes(range ?? '1M')
    ) {
      throw new BadRequestException(
        simulatorProblem(
          400,
          'VALIDATION_FAILED',
          'Market history query is invalid.',
        ),
      );
    }
    if ((await this.scenarioService.beforeRead()) === 'MALFORMED_RESPONSE') {
      return null;
    }
    return {
      schemaVersion: 'simulator-v1',
      instrumentId,
      range: range ?? '1M',
      points: (await this.repository.history(instrumentId)).map((item) => ({
        price: item.price,
        currency: item.currency,
        asOfAt: item.asOfAt.toISOString(),
      })),
    };
  }
}
