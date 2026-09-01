import { describe, expect, it, vi } from 'vitest';

import { HttpPlatformApi } from './http-platform-api';
import type { PlatformApiError } from './platform-api';

describe('HttpPlatformApi', () => {
  it('calls the canonical health endpoint with a request ID', async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        datasetVersion: 'baseline-v1',
        service: 'platform-api',
        status: 'ok',
      }),
    );
    const api = new HttpPlatformApi({
      baseUrl: 'https://platform.example/',
      fetch,
      requestId: () => 'request-fe-0001',
    });

    await expect(api.getHealth()).resolves.toEqual({
      datasetVersion: 'baseline-v1',
      service: 'platform-api',
      status: 'ok',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://platform.example/api/v1/health',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'X-Request-Id': 'request-fe-0001',
        },
        method: 'GET',
      }),
    );
  });

  it('normalizes a retryable HTTP failure', async () => {
    const api = new HttpPlatformApi({
      baseUrl: 'https://platform.example',
      fetch: async () => new Response(undefined, { status: 429 }),
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'http',
      retryable: true,
      status: 429,
    } satisfies Partial<PlatformApiError>);
  });

  it('rejects a response outside the canonical schema', async () => {
    const api = new HttpPlatformApi({
      baseUrl: 'https://platform.example',
      fetch: async () =>
        Response.json({ service: 'platform-api', status: 'ok' }),
    });

    await expect(api.getHealth()).rejects.toMatchObject({
      kind: 'contract',
      retryable: false,
    } satisfies Partial<PlatformApiError>);
  });
});
