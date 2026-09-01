export const PLATFORM_CONTRACT_VERSION = 'platform-v1' as const;

export interface PlatformHealthResponse {
  readonly datasetVersion: string;
  readonly service: 'platform-api';
  readonly status: 'ok';
}

export interface PlatformApi {
  getHealth(signal?: AbortSignal): Promise<PlatformHealthResponse>;
}
