import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import {
  DeveloperInputError,
  DeveloperService,
} from '../application/developer.service.js';
import { DeveloperAccessGuard } from './developer-access.guard.js';

function problem() {
  return {
    type: 'https://wealth-sandbox.local/problems/validation-failed',
    title: 'Validation Failed',
    status: 400,
    code: 'VALIDATION_FAILED',
    detail: 'Developer scenario request is invalid.',
    traceId: 'unavailable',
    retryable: false,
    fieldErrors: [],
  };
}

@Controller('/api/v1/dev')
@UseGuards(DeveloperAccessGuard)
@RequiredScopes('scenario.admin')
export class DeveloperController {
  constructor(
    @Inject(DeveloperService)
    private readonly developerService: DeveloperService,
  ) {}

  @Put('/scenario')
  async setScenario(
    @Body() body: unknown,
    @Headers('x-correlation-id') traceId: string | undefined,
  ) {
    try {
      return await this.developerService.setScenario(body, traceId);
    } catch (error) {
      if (error instanceof DeveloperInputError) {
        throw new BadRequestException(problem());
      }
      throw error;
    }
  }

  @Post('/dataset/reset')
  @HttpCode(200)
  reset(@Headers('x-correlation-id') traceId: string | undefined) {
    return this.developerService.reset(traceId);
  }
}
