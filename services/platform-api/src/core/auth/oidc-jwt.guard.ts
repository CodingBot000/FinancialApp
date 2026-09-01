import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Reflector as ReflectorToken } from '@nestjs/core';
import {
  createRemoteJWKSet,
  errors as joseErrors,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

import type { AuthenticatedPrincipal } from './authenticated-principal.js';
import { REQUIRED_SCOPES_METADATA } from './required-scopes.decorator.js';

interface GuardRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPrincipal;
}

interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly traceId: string;
  readonly retryable: false;
  readonly fieldErrors: readonly never[];
}

function readHeader(
  headers: GuardRequest['headers'],
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function problem(
  request: GuardRequest,
  status: number,
  code: string,
  title: string,
  detail: string,
): ProblemDetails {
  return {
    type: `https://wealth-sandbox.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title,
    status,
    code,
    detail,
    traceId:
      readHeader(request.headers, 'x-correlation-id') ??
      readHeader(request.headers, 'x-request-id') ??
      'unavailable',
    retryable: false,
    fieldErrors: [],
  };
}

@Injectable()
export class OidcJwtGuard implements CanActivate {
  private jwksUri?: string;
  private remoteJwks?: JWTVerifyGetKey;

  constructor(@Inject(ReflectorToken) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const authorization = readHeader(request.headers, 'authorization');

    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        problem(
          request,
          401,
          'AUTH_TOKEN_INVALID',
          'Invalid access token',
          'A valid Bearer access token is required.',
        ),
      );
    }

    const issuer = process.env.OIDC_ISSUER;
    const audience = process.env.OIDC_AUDIENCE;
    const jwksUri = process.env.OIDC_JWKS_URI;

    if (
      issuer === undefined ||
      audience === undefined ||
      jwksUri === undefined
    ) {
      throw new UnauthorizedException(
        problem(
          request,
          401,
          'AUTH_TOKEN_INVALID',
          'Invalid access token',
          'OIDC verification is not configured.',
        ),
      );
    }

    try {
      const { payload } = await jwtVerify(
        authorization.slice('Bearer '.length),
        this.getRemoteJwks(jwksUri),
        { audience, issuer },
      );

      if (payload.sub === undefined || payload.iss === undefined) {
        throw new joseErrors.JWTClaimValidationFailed(
          'Required subject or issuer claim is missing.',
          payload,
          'sub',
          'missing',
        );
      }

      const scopes = new Set(
        typeof payload.scope === 'string'
          ? payload.scope.split(' ').filter((scope) => scope.length > 0)
          : [],
      );
      const requiredScopes =
        this.reflector.getAllAndOverride<readonly string[]>(
          REQUIRED_SCOPES_METADATA,
          [context.getHandler(), context.getClass()],
        ) ?? [];
      const missingScopes = requiredScopes.filter(
        (scope) => !scopes.has(scope),
      );

      if (missingScopes.length > 0) {
        throw new ForbiddenException(
          problem(
            request,
            403,
            'AUTH_SCOPE_MISSING',
            'Required scope is missing',
            'The access token does not grant the required operation.',
          ),
        );
      }

      request.user = {
        issuer: payload.iss,
        subject: payload.sub,
        scopes,
      };
      return true;
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException(
        problem(
          request,
          401,
          'AUTH_TOKEN_INVALID',
          'Invalid access token',
          'The access token could not be verified.',
        ),
      );
    }
  }

  private getRemoteJwks(jwksUri: string): JWTVerifyGetKey {
    if (this.remoteJwks === undefined || this.jwksUri !== jwksUri) {
      this.jwksUri = jwksUri;
      this.remoteJwks = createRemoteJWKSet(new URL(jwksUri));
    }

    return this.remoteJwks;
  }
}
