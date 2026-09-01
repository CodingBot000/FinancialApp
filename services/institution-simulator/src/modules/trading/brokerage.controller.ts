import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { simulatorProblem } from '../../core/http/simulator-problem.js';
import {
  BrokerageConflictError,
  BrokerageInputError,
  BrokerageNotFoundError,
  BrokerageService,
} from './application/brokerage.service.js';

@Controller('/sim/v1/brokerage/orders')
export class BrokerageController {
  constructor(
    @Inject(BrokerageService)
    private readonly brokerageService: BrokerageService,
  ) {}

  @Post()
  async submit(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    try {
      const result = await this.brokerageService.submit(body);
      if ('malformed' in result) return result;
      response.code(result.created ? 201 : 200);
      return result.order;
    } catch (error) {
      if (error instanceof BrokerageInputError) {
        throw new BadRequestException(
          simulatorProblem(
            400,
            'VALIDATION_FAILED',
            'Brokerage order request is invalid.',
          ),
        );
      }
      if (error instanceof BrokerageConflictError) {
        throw new ConflictException(
          simulatorProblem(
            409,
            'IDEMPOTENCY_CONFLICT',
            'clientOrderId payload conflicts.',
          ),
        );
      }
      if (error instanceof BrokerageNotFoundError) {
        throw new NotFoundException(
          simulatorProblem(
            404,
            'RESOURCE_NOT_FOUND',
            'Brokerage resource was not found.',
          ),
        );
      }
      throw error;
    }
  }

  @Get('/by-client-order-id/:clientOrderId')
  async find(@Param('clientOrderId') clientOrderId: string) {
    try {
      return await this.brokerageService.find(clientOrderId);
    } catch (error) {
      if (error instanceof BrokerageInputError) {
        throw new BadRequestException(
          simulatorProblem(
            400,
            'VALIDATION_FAILED',
            'clientOrderId is invalid.',
          ),
        );
      }
      if (error instanceof BrokerageNotFoundError) {
        throw new NotFoundException(
          simulatorProblem(
            404,
            'RESOURCE_NOT_FOUND',
            'Brokerage order was not found.',
          ),
        );
      }
      throw error;
    }
  }
}
