import { describe, expect, it } from 'vitest';

import { PlatformApiError } from '../../../shared/api';
import { healthErrorDetails } from './health-state';

describe('healthErrorDetails', () => {
  it('does not render an error when an unmounted request is aborted', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';

    expect(healthErrorDetails(error)).toBeUndefined();
  });

  it('preserves the adapter retry decision', () => {
    const error = new PlatformApiError({
      kind: 'contract',
      message: 'invalid contract',
      retryable: false,
    });

    expect(healthErrorDetails(error)).toEqual({
      message: 'invalid contract',
      retryable: false,
    });
  });
});
