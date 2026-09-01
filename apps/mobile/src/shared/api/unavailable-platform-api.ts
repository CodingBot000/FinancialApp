import {
  PlatformApiError,
  type CurrentUserResponse,
  type PlatformApi,
  type PlatformHealthResponse,
} from './platform-api';

export class UnavailablePlatformApi implements PlatformApi {
  constructor(private readonly reason: string) {}

  getCurrentUser(): Promise<CurrentUserResponse> {
    return this.reject();
  }

  getHealth(): Promise<PlatformHealthResponse> {
    return this.reject();
  }

  private reject<T>(): Promise<T> {
    return Promise.reject(
      new PlatformApiError({
        kind: 'configuration',
        message: this.reason,
        retryable: false,
      }),
    );
  }
}
