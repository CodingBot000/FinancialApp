import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import {
  SimulationInputError,
  SimulationNotFoundError,
  SimulationService,
} from '../application/simulation.service.js';
import type { SimulationView } from '../domain/simulation-model.js';

function problem(status: number, code: string, detail: string) {
  return {
    type: `https://wealth-sandbox.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .toLowerCase()
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' '),
    status,
    code,
    detail,
    traceId: 'unavailable',
    retryable: false,
    fieldErrors: [],
  };
}

@Controller('/api/v1/simulations')
@UseGuards(OidcJwtGuard)
@RequiredScopes('simulation.execute')
export class SimulationController {
  constructor(
    @Inject(SimulationService)
    private readonly simulationService: SimulationService,
  ) {}

  @Post()
  async create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers('x-correlation-id') traceId: string | undefined,
    @Body() body: unknown,
  ): Promise<SimulationView> {
    try {
      return await this.simulationService.create(principal, body, traceId);
    } catch (error: unknown) {
      if (error instanceof SimulationInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', 'Simulation request is invalid.'),
        );
      }
      throw error;
    }
  }

  @Get('/:simulationId')
  async get(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('simulationId') simulationId: string,
  ): Promise<SimulationView> {
    try {
      return await this.simulationService.get(principal, simulationId);
    } catch (error: unknown) {
      if (error instanceof SimulationNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      throw error;
    }
  }
}
