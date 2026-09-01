import {
  PlatformApiError,
  type CurrentUserResponse,
  type PlatformApi,
  type PlatformHealthResponse,
  type PlatformRequestOptions,
} from './platform-api';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpPlatformApiOptions {
  readonly authenticatedFetch?: FetchLike;
  readonly baseUrl: string;
  readonly fetch?: FetchLike;
  readonly requestId?: () => string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function isCurrentUserResponse(value: unknown): value is CurrentUserResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 5 &&
    typeof record.userId === 'string' &&
    UUID_PATTERN.test(record.userId) &&
    typeof record.displayName === 'string' &&
    record.displayName.length > 0 &&
    ['BALANCED', 'CONSERVATIVE', 'GROWTH'].includes(
      String(record.riskProfile),
    ) &&
    typeof record.datasetVersion === 'string' &&
    record.datasetVersion.length > 0 &&
    record.syntheticData === true
  );
}

export class HttpPlatformApi implements PlatformApi {
  private readonly authenticatedFetch: FetchLike;
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly requestId: () => string;

  constructor(options: HttpPlatformApiOptions) {
    this.authenticatedFetch =
      options.authenticatedFetch ?? options.fetch ?? globalThis.fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetch = options.fetch ?? globalThis.fetch;
    this.requestId = options.requestId ?? defaultRequestId;
  }

  getCurrentUser(
    options: PlatformRequestOptions = {},
  ): Promise<CurrentUserResponse> {
    return this.requestJson(
      '/api/v1/me',
      isCurrentUserResponse,
      options,
      this.authenticatedFetch,
    );
  }

  async getHealth(
    options: PlatformRequestOptions = {},
  ): Promise<PlatformHealthResponse> {
    return this.requestJson(
      '/api/v1/health',
      isPlatformHealthResponse,
      options,
      this.fetch,
    );
  }

  private async requestJson<T>(
    path: string,
    validate: (value: unknown) => value is T,
    options: PlatformRequestOptions,
    fetch: FetchLike,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
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

    if (!validate(payload)) {
      throw new PlatformApiError({
        kind: 'contract',
        message: 'Platform API 응답이 platform-v1 계약과 일치하지 않습니다.',
        retryable: false,
      });
    }

    return payload;
  }
}
