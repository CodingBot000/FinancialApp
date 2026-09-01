import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { HealthService } from './health.service.js';
import type {
  PlatformHealthResponse,
  PlatformReadinessResponse,
} from './health-model.js';

@Controller('api/v1/health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  getHealth(): PlatformHealthResponse {
    return {
      datasetVersion: process.env.FINAPP_DATASET_VERSION ?? 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    };
  }

  @Get('ready')
  async getReadiness(
    @Res({ passthrough: true }) response: FastifyReply,
  ): Promise<PlatformReadinessResponse> {
    const readiness = await this.health.readiness();
    response.code(readiness.status === 'ready' ? 200 : 503);
    return readiness;
  }

  @Get('metrics')
  getMetrics() {
    return this.health.metrics();
  }
}
