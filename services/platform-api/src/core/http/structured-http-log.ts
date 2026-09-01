export interface StructuredHttpLog {
  readonly timestamp: string;
  readonly level: 'info';
  readonly event: 'http_request_completed';
  readonly requestId: string;
  readonly correlationId: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly durationMs: number;
}

export function createStructuredHttpLog(input: {
  readonly requestId: string;
  readonly correlationId: string;
  readonly method: string;
  readonly rawUrl: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly now?: Date;
}): StructuredHttpLog {
  return {
    timestamp: (input.now ?? new Date()).toISOString(),
    level: 'info',
    event: 'http_request_completed',
    requestId: input.requestId.slice(0, 128),
    correlationId: input.correlationId.slice(0, 128),
    method: input.method.slice(0, 16),
    path: (input.rawUrl.split('?')[0] || '/').slice(0, 240),
    statusCode: input.statusCode,
    durationMs: Math.max(0, Math.round(input.durationMs)),
  };
}
