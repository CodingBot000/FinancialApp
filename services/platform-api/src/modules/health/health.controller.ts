import { Controller, Get } from '@nestjs/common';

export interface PlatformHealthResponse {
  readonly datasetVersion: string;
  readonly service: 'platform-api';
  readonly status: 'ok';
}

@Controller('api/v1/health')
export class HealthController {
  @Get()
  getHealth(): PlatformHealthResponse {
    return {
      datasetVersion: process.env.FINAPP_DATASET_VERSION ?? 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    };
  }
}
