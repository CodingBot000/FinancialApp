import {
  PlatformApiError,
  type PlatformApi,
  type PlatformHealthResponse,
  type PlatformRequestOptions,
} from './platform-api';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpPlatformApiOptions {
  readonly baseUrl: string;
  readonly fetch?: FetchLike;
  readonly requestId?: () => string;
}

function defaultRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isPlatformHealthResponse(
  value: unknown,
): value is PlatformHealthResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 3 &&
    record.status === 'ok' &&
    record.service === 'platform-api' &&
    typeof record.datasetVersion === 'string' &&
    record.datasetVersion.length > 0
  );
}

export class HttpPlatformApi implements PlatformApi {
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly requestId: () => string;

  constructor(options: HttpPlatformApiOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetch = options.fetch ?? globalThis.fetch;
    this.requestId = options.requestId ?? defaultRequestId;
  }

  async getHealth(
    options: PlatformRequestOptions = {},
  ): Promise<PlatformHealthResponse> {
    let response: Response;

    try {
      response = await this.fetch(`${this.baseUrl}/api/v1/health`, {
        headers: {
          Accept: 'application/json',
          'X-Request-Id': this.requestId(),
        },
        method: 'GET',
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new PlatformApiError({
        cause: error,
        kind: 'network',
        message: 'Platform API에 연결할 수 없습니다.',
        retryable: true,
      });
    }

    if (!response.ok) {
      throw new PlatformApiError({
        kind: 'http',
        message: 'Platform API가 요청을 처리하지 못했습니다.',
        retryable: response.status === 429 || response.status >= 500,
        status: response.status,
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new PlatformApiError({
        cause: error,
        kind: 'contract',
        message: 'Platform API 응답을 읽을 수 없습니다.',
        retryable: false,
      });
    }

    if (!isPlatformHealthResponse(payload)) {
      throw new PlatformApiError({
        kind: 'contract',
        message: 'Platform API 응답이 platform-v1 계약과 일치하지 않습니다.',
        retryable: false,
      });
    }

    return payload;
  }
}
