import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { FastifyAdapter } from '@nestjs/platform-fastify';

import { createStructuredHttpLog } from './structured-http-log.js';

const MAX_TRACE_HEADER_LENGTH = 128;
const SAFE_TRACE_HEADER = /^[A-Za-z0-9._:-]+$/;

function readTraceHeader(
  value: string | string[] | undefined,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === undefined ||
    candidate.length === 0 ||
    candidate.length > MAX_TRACE_HEADER_LENGTH ||
    !SAFE_TRACE_HEADER.test(candidate)
  ) {
    return undefined;
  }

  return candidate;
}

export function createFastifyAdapter(): FastifyAdapter {
  const startedAt = new WeakMap<object, number>();
  const adapter = new FastifyAdapter({
    genReqId: (request: IncomingMessage) =>
      readTraceHeader(request.headers['x-request-id']) ?? randomUUID(),
  });

  adapter.getInstance().addHook('onRequest', (request, reply, done) => {
    startedAt.set(request, performance.now());
    const requestId = String(request.id);
    const correlationId =
      readTraceHeader(request.headers['x-correlation-id']) ?? requestId;

    request.headers['x-request-id'] = requestId;
    request.headers['x-correlation-id'] = correlationId;
    void reply.header('x-request-id', requestId);
    void reply.header('x-correlation-id', correlationId);
    done();
  });

  adapter.getInstance().addHook('onResponse', (request, reply, done) => {
    if (process.env.STRUCTURED_HTTP_LOG_ENABLED === 'true') {
      const event = createStructuredHttpLog({
        requestId: String(request.id),
        correlationId:
          readTraceHeader(request.headers['x-correlation-id']) ??
          String(request.id),
        method: request.method,
        rawUrl: request.url,
        statusCode: reply.statusCode,
        durationMs: performance.now() - (startedAt.get(request) ?? 0),
      });
      process.stdout.write(`${JSON.stringify(event)}\n`);
    }
    startedAt.delete(request);
    done();
  });

  return adapter;
}
