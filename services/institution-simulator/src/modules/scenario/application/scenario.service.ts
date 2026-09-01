import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { simulatorProblem } from '../../../core/http/simulator-problem.js';
import type { ScenarioMode } from '../domain/scenario-mode.js';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepository,
} from './ports/scenario-repository.port.js';

export type ScenarioReadDecision = 'NORMAL' | 'MALFORMED_RESPONSE';

@Injectable()
export class ScenarioService {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly repository: ScenarioRepository,
  ) {}

  assertAdminEnabled(): void {
    if ((process.env.APP_ENV ?? 'local') === 'production') {
      throw new NotFoundException(
        simulatorProblem(404, 'RESOURCE_NOT_FOUND', 'The route was not found.'),
      );
    }
  }

  current(): Promise<ScenarioMode> {
    return this.repository.current();
  }

  async beforeRead(): Promise<ScenarioReadDecision> {
    const mode = await this.current();
    if (mode === 'TIMEOUT') {
      const milliseconds = Number.parseInt(
        process.env.SIMULATOR_SCENARIO_TIMEOUT_MS ?? '5500',
        10,
      );
      await new Promise((resolve) => setTimeout(resolve, milliseconds));
    }
    if (mode === 'HTTP_500') {
      throw new InternalServerErrorException(
        simulatorProblem(
          500,
          'SIMULATOR_SCENARIO_HTTP_500',
          'Synthetic simulator failure.',
        ),
      );
    }
    return mode === 'MALFORMED_RESPONSE' ? mode : 'NORMAL';
  }

  async reset(): Promise<void> {
    this.assertAdminEnabled();
    await this.repository.reset();
  }

  async seed(): Promise<void> {
    await this.repository.seed();
  }

  async set(mode: ScenarioMode): Promise<void> {
    this.assertAdminEnabled();
    await this.repository.set(mode);
  }
}
