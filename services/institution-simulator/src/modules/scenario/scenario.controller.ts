import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Put,
} from '@nestjs/common';

import { simulatorProblem } from '../../core/http/simulator-problem.js';
import { AccountRepository } from '../account/account.repository.js';
import { ScenarioService } from './application/scenario.service.js';
import { isScenarioMode } from './domain/scenario-mode.js';

@Controller('/sim/v1/admin')
export class ScenarioController {
  constructor(
    @Inject(ScenarioService)
    private readonly scenarioService: ScenarioService,
    @Inject(AccountRepository)
    private readonly accountRepository: AccountRepository,
  ) {}

  @Put('/scenario')
  async setScenario(@Body() body: unknown) {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('mode' in body) ||
      !isScenarioMode(body.mode)
    ) {
      throw new BadRequestException(
        simulatorProblem(400, 'VALIDATION_FAILED', 'Scenario mode is invalid.'),
      );
    }
    await this.scenarioService.set(body.mode);
    return { mode: body.mode, scope: 'GLOBAL' as const };
  }

  @Post('/reset')
  @HttpCode(200)
  async reset() {
    this.scenarioService.assertAdminEnabled();
    await this.accountRepository.seedBalancedWorker();
    await this.scenarioService.reset();
    return {
      datasetVersion:
        process.env.FINAPP_DATASET_VERSION ?? 'FINANCIAL_APP_DATASET_V1',
      scenarioMode: 'NORMAL' as const,
      syntheticData: true as const,
    };
  }
}
