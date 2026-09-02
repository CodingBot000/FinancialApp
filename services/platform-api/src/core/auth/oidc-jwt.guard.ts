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
import { SecurityEventService } from '../../modules/audit/security-event.service.js';

interface GuardRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly ip?: string;
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

const LOCAL_TEST_SCOPES = new Set([
  'financial.read',
  'financial.write',
  'simulation.execute',
  'order.execute',
  'scenario.admin',
]);

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

  constructor(
    @Inject(ReflectorToken) private readonly reflector: Reflector,
    @Inject(SecurityEventService)
    private readonly securityEvents: SecurityEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const authorization = readHeader(request.headers, 'authorization');

    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      await this.recordFailure(
        request,
        'AUTHENTICATION_FAILURE',
        'AUTH_HEADER_MISSING',
      );
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

    const requiredScopes =
      this.reflector.getAllAndOverride<readonly string[]>(
        REQUIRED_SCOPES_METADATA,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    const localTestToken = process.env.FINAPP_LOCAL_TEST_ACCESS_TOKEN?.trim();

    // This explicit test token is available only in the local profile. It is
    // never accepted by demo or production, where OIDC verification remains
    // mandatory.
    if (
      process.env.APP_ENV === 'local' &&
      localTestToken !== undefined &&
      authorization === `Bearer ${localTestToken}`
    ) {
      request.user = {
        issuer:
          process.env.OIDC_ISSUER ?? 'http://localhost:8083/realms/finapp',
        subject: 'local-test-user',
        scopes: LOCAL_TEST_SCOPES,
      };
      return true;
    }

    const issuer = process.env.OIDC_ISSUER;
    const audience = process.env.OIDC_AUDIENCE;
    const jwksUri = process.env.OIDC_JWKS_URI;

    if (
      issuer === undefined ||
      audience === undefined ||
      jwksUri === undefined
    ) {
      await this.recordFailure(
        request,
        'AUTHENTICATION_FAILURE',
        'OIDC_NOT_CONFIGURED',
      );
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
      const missingScopes = requiredScopes.filter(
        (scope) => !scopes.has(scope),
      );

      if (missingScopes.length > 0) {
        await this.recordFailure(
          request,
          'AUTHORIZATION_FAILURE',
          'AUTH_SCOPE_MISSING',
          { requiredScopeCount: missingScopes.length },
        );
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

      await this.recordFailure(
        request,
        'AUTHENTICATION_FAILURE',
        'AUTH_TOKEN_INVALID',
      );

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

  private recordFailure(
    request: GuardRequest,
    eventType: 'AUTHENTICATION_FAILURE' | 'AUTHORIZATION_FAILURE',
    reasonCode: string,
    metadata?: Readonly<Record<string, number | boolean>>,
  ): Promise<void> {
    return this.securityEvents.recordSafely({
      eventType,
      reasonCode,
      traceId:
        readHeader(request.headers, 'x-correlation-id') ??
        readHeader(request.headers, 'x-request-id') ??
        'unavailable',
      ...(request.ip === undefined ? {} : { sourceIp: request.ip }),
      ...(metadata === undefined ? {} : { metadata }),
    });
  }
}
