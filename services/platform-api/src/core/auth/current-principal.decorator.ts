import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedPrincipal } from './authenticated-principal.js';

interface AuthenticatedRequest {
  readonly user?: AuthenticatedPrincipal;
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user === undefined) {
      throw new Error('Authenticated principal is missing after JWT guard.');
    }

    return request.user;
  },
);
