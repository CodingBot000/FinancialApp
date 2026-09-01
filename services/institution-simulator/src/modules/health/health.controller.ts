import { Controller, Get } from '@nestjs/common';

export interface SimulatorHealthResponse {
  readonly datasetVersion: string;
  readonly service: 'institution-simulator';
  readonly status: 'ok';
}

@Controller('sim/v1/health')
export class HealthController {
  @Get()
  getHealth(): SimulatorHealthResponse {
    return {
      datasetVersion: process.env.FINAPP_DATASET_VERSION ?? 'baseline-v1',
      service: 'institution-simulator',
      status: 'ok',
    };
  }
}
