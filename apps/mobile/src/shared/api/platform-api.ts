export const PLATFORM_CONTRACT_VERSION = 'platform-v1' as const;

export interface PlatformRequestOptions {
  readonly signal?: AbortSignal;
}

export interface PlatformHealthResponse {
  readonly datasetVersion: string;
  readonly service: 'platform-api';
  readonly status: 'ok';
}

export interface PlatformApi {
  getHealth(options?: PlatformRequestOptions): Promise<PlatformHealthResponse>;
}

export type PlatformApiErrorKind = 'contract' | 'http' | 'network' | 'timeout';

export class PlatformApiError extends Error {
  readonly kind: PlatformApiErrorKind;
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor({
    cause,
    kind,
    message,
    retryable,
    status,
  }: {
    readonly cause?: unknown;
    readonly kind: PlatformApiErrorKind;
    readonly message: string;
    readonly retryable: boolean;
    readonly status?: number;
  }) {
    super(message, { cause });
    this.name = 'PlatformApiError';
    this.kind = kind;
    this.retryable = retryable;
    this.status = status;
  }
}
