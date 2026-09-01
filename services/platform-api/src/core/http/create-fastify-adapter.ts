import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { FastifyAdapter } from '@nestjs/platform-fastify';

const MAX_TRACE_HEADER_LENGTH = 128;

function readTraceHeader(
  value: string | string[] | undefined,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === undefined ||
    candidate.length === 0 ||
    candidate.length > MAX_TRACE_HEADER_LENGTH
  ) {
    return undefined;
  }

  return candidate;
}

export function createFastifyAdapter(): FastifyAdapter {
  const adapter = new FastifyAdapter({
    genReqId: (request: IncomingMessage) =>
      readTraceHeader(request.headers['x-request-id']) ?? randomUUID(),
  });

  adapter.getInstance().addHook('onRequest', (request, reply, done) => {
    const requestId = String(request.id);
    const correlationId =
      readTraceHeader(request.headers['x-correlation-id']) ?? requestId;

    request.headers['x-request-id'] = requestId;
    request.headers['x-correlation-id'] = correlationId;
    void reply.header('x-request-id', requestId);
    void reply.header('x-correlation-id', correlationId);
    done();
  });

  return adapter;
}
