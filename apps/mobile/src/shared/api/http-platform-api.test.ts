import { describe, expect, it, vi } from 'vitest';

import { HttpPlatformApi } from './http-platform-api';
import type { PlatformApiError } from './platform-api';

describe('HttpPlatformApi', () => {
  it('maps the authenticated canonical current user response', async () => {
    const authenticatedFetch = vi.fn(async () =>
      Response.json({
        datasetVersion: 'FINANCIAL_APP_DATASET_V1',
        displayName: '테스트 사용자 A',
        riskProfile: 'BALANCED',
        syntheticData: true,
        userId: '4e34157c-f4fa-4f77-aeaf-19ea60ec6806',
      }),
    );
    const api = new HttpPlatformApi({
      authenticatedFetch,
      baseUrl: 'https://platform.example/',
      requestId: () => 'request-fe-0010',
    });

    await expect(api.getCurrentUser()).resolves.toMatchObject({
      displayName: '테스트 사용자 A',
      riskProfile: 'BALANCED',
      syntheticData: true,
    });
    expect(authenticatedFetch).toHaveBeenCalledWith(
      'https://platform.example/api/v1/me',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('keeps missing-scope failures non-retryable', async () => {
    const api = new HttpPlatformApi({
      authenticatedFetch: async () => new Response(undefined, { status: 403 }),
      baseUrl: 'https://platform.example',
    });

    await expect(api.getCurrentUser()).rejects.toMatchObject({
      kind: 'http',
      retryable: false,
      status: 403,
    } satisfies Partial<PlatformApiError>);
  });

  it('rejects a current user response outside the canonical schema', async () => {
    const api = new HttpPlatformApi({
      authenticatedFetch: async () =>
        Response.json({
          displayName: '테스트 사용자 A',
          riskProfile: 'BALANCED',
          syntheticData: false,
          userId: 'not-a-uuid',
        }),
      baseUrl: 'https://platform.example',
    });

    await expect(api.getCurrentUser()).rejects.toMatchObject({
      kind: 'contract',
      retryable: false,
    } satisfies Partial<PlatformApiError>);
  });

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
