import {
  PlatformApiError,
  type PlatformHealthResponse,
} from '../../../shared/api';

export type HealthState =
  | { readonly status: 'loading' }
  | {
      readonly checkedAt: Date;
      readonly health: PlatformHealthResponse;
      readonly status: 'ready';
    }
  | {
      readonly message: string;
      readonly retryable: boolean;
      readonly status: 'error';
    };

export function healthErrorDetails(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return undefined;
  }
  if (error instanceof PlatformApiError) {
    return { message: error.message, retryable: error.retryable };
  }
  if (error instanceof Error) {
    return { message: error.message, retryable: true };
  }
  return {
    message: 'Platform API 상태를 확인할 수 없습니다.',
    retryable: true,
  };
}
