import { Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service.js';

import {
  SIMULATOR_ADMIN_PORT,
  type ScenarioMode,
  type SimulatorAdminPort,
} from './ports/simulator-admin.port.js';

const MODES = new Set<ScenarioMode>([
  'NORMAL',
  'TIMEOUT',
  'HTTP_500',
  'MALFORMED_RESPONSE',
  'ORDER_REJECT',
  'ORDER_UNKNOWN_THEN_FILLED',
]);

export class DeveloperInputError extends Error {}

@Injectable()
export class DeveloperService {
  constructor(
    @Inject(SIMULATOR_ADMIN_PORT)
    private readonly admin: SimulatorAdminPort,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  async setScenario(value: unknown, traceId = 'unavailable') {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('mode' in value) ||
      typeof value.mode !== 'string' ||
      !MODES.has(value.mode as ScenarioMode) ||
      ('correlationScope' in value && value.correlationScope !== 'CURRENT_USER')
    ) {
      throw new DeveloperInputError();
    }
    const result = await this.admin.setScenario(value.mode as ScenarioMode);
    await this.audit.record({
      userId: null,
      action: 'DEV_SCENARIO_CHANGED',
      resourceType: 'SIMULATOR_SCENARIO',
      resourceId: null,
      traceId,
      metadata: { mode: result.mode, operation: 'SET', syntheticData: true },
    });
    return result;
  }

  async reset(traceId = 'unavailable') {
    const result = await this.admin.reset();
    await this.audit.record({
      userId: null,
      action: 'DEV_SCENARIO_CHANGED',
      resourceType: 'SIMULATOR_SCENARIO',
      resourceId: null,
      traceId,
      metadata: { mode: 'NORMAL', operation: 'RESET', syntheticData: true },
    });
    return result;
  }
}
