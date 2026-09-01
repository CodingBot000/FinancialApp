import {
  PlatformApiError,
  type CurrentUserResponse,
  type PlatformApi,
  type PlatformHealthResponse,
  type PlatformRequestOptions,
} from '../platform-api';
import currentUserFixture from './fixtures/current-user.success.json';
import fixture from './fixtures/platform-health.success.json';

const platformHealthFixture = fixture as PlatformHealthResponse;
const currentUser = currentUserFixture as CurrentUserResponse;

export type ContractMockHealthScenario = 'rate-limited' | 'success' | 'timeout';

export interface ContractMockPlatformApiOptions {
  readonly latencyMs?: number;
  readonly scenario?: ContractMockHealthScenario;
}

function createAbortError() {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function waitForMockLatency(milliseconds: number, signal?: AbortSignal) {
  if (signal?.aborted === true) {
    return Promise.reject(createAbortError());
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(createAbortError());
      },
      { once: true },
    );
  });
}

export class ContractMockPlatformApi implements PlatformApi {
  private readonly latencyMs: number;
  private readonly scenario: ContractMockHealthScenario;

  constructor(options: ContractMockPlatformApiOptions = {}) {
    this.latencyMs = options.latencyMs ?? 250;
    this.scenario = options.scenario ?? 'success';
  }

  async getCurrentUser(
    options: PlatformRequestOptions = {},
  ): Promise<CurrentUserResponse> {
    await waitForMockLatency(this.latencyMs, options.signal);
    return structuredClone(currentUser);
  }

  async getHealth(
    options: PlatformRequestOptions = {},
  ): Promise<PlatformHealthResponse> {
    if (this.scenario === 'timeout') {
      await waitForMockLatency(this.latencyMs, options.signal);
      throw new PlatformApiError({
        kind: 'timeout',
        message: 'Platform API 응답 시간이 초과되었습니다.',
        retryable: true,
      });
    }

    await waitForMockLatency(this.latencyMs, options.signal);
    if (this.scenario === 'rate-limited') {
      throw new PlatformApiError({
        kind: 'http',
        message: 'Platform API 요청이 너무 많습니다.',
        retryable: true,
        status: 429,
      });
    }

    return structuredClone(platformHealthFixture);
  }
}
