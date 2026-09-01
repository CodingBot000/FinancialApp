import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type {
  ScenarioMode,
  SimulatorAdminPort,
} from '../../application/ports/simulator-admin.port.js';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

@Injectable()
export class SimulatorAdminAdapter implements SimulatorAdminPort {
  async setScenario(mode: ScenarioMode) {
    const body = record(
      await this.request('/sim/v1/admin/scenario', {
        method: 'PUT',
        body: JSON.stringify({ mode }),
      }),
    );
    if (body?.mode !== mode || body.scope !== 'GLOBAL') {
      throw new Error('Simulator scenario response is invalid.');
    }
    return { mode, scope: 'GLOBAL' as const };
  }

  async reset() {
    const body = record(
      await this.request('/sim/v1/admin/reset', { method: 'POST' }),
    );
    if (
      typeof body?.datasetVersion !== 'string' ||
      body.scenarioMode !== 'NORMAL' ||
      body.syntheticData !== true
    ) {
      throw new Error('Simulator reset response is invalid.');
    }
    return {
      datasetVersion: body.datasetVersion,
      scenarioMode: 'NORMAL' as const,
      syntheticData: true as const,
    };
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const requestId = randomUUID();
    const response = await fetch(
      `${process.env.INSTITUTION_SIMULATOR_BASE_URL ?? 'http://127.0.0.1:8082'}${path}`,
      {
        ...init,
        headers: {
          ...(init.body === undefined
            ? {}
            : { 'content-type': 'application/json' }),
          'x-correlation-id': requestId,
          'x-request-id': requestId,
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error('Simulator admin request failed.');
    return response.json();
  }
}
