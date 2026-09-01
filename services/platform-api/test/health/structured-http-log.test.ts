import { describe, expect, it } from 'vitest';

import { createStructuredHttpLog } from '../../src/core/http/structured-http-log.js';

describe('structured HTTP logging', () => {
  it('emits an allowlisted query-free event without accepting headers or body', () => {
    const event = createStructuredHttpLog({
      requestId: 'request-1',
      correlationId: 'correlation-1',
      method: 'POST',
      rawUrl: '/api/v1/orders?access_token=token-placeholder&account=full-id',
      statusCode: 202,
      durationMs: 12.6,
      now: new Date('2026-09-02T00:00:00.000Z'),
    });
    const serialized = JSON.stringify(event);

    expect(event).toEqual({
      timestamp: '2026-09-02T00:00:00.000Z',
      level: 'info',
      event: 'http_request_completed',
      requestId: 'request-1',
      correlationId: 'correlation-1',
      method: 'POST',
      path: '/api/v1/orders',
      statusCode: 202,
      durationMs: 13,
    });
    expect(serialized).not.toContain('access_token');
    expect(serialized).not.toContain('token-placeholder');
    expect(serialized).not.toContain('full-id');
    expect(serialized).not.toContain('authorization');
  });
});
