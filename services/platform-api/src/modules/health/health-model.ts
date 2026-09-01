export interface PlatformHealthResponse {
  readonly datasetVersion: string;
  readonly service: 'platform-api';
  readonly status: 'ok';
}

export interface PlatformReadinessResponse {
  readonly status: 'ready' | 'not_ready';
  readonly service: 'platform-api';
  readonly datasetVersion: string;
  readonly checks: { readonly database: 'up' | 'down' };
}
