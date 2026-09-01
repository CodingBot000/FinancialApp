import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import { CurrentPrincipal } from '../../../core/auth/current-principal.decorator.js';
import { OidcJwtGuard } from '../../../core/auth/oidc-jwt.guard.js';
import { RequiredScopes } from '../../../core/auth/required-scopes.decorator.js';
import {
  MyDataInputError,
  MyDataService,
} from '../application/mydata.service.js';
import type { ConnectionView, SyncView } from '../domain/institution-data.js';
import {
  MyDataConnectionConflictError,
  MyDataResourceNotFoundError,
} from '../domain/mydata-errors.js';

interface CreateConnectionBody {
  readonly institutionCode?: unknown;
  readonly consentExpiresAt?: unknown;
}

interface CreateSyncBody {
  readonly connectionId?: unknown;
}

interface StatusReply {
  status(code: number): StatusReply;
}

function problem(status: number, code: string, detail: string) {
  return {
    type: `https://wealth-sandbox.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .toLowerCase()
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' '),
    status,
    code,
    detail,
    traceId: 'unavailable',
    retryable: false,
    fieldErrors: [],
  };
}

@Controller('/api/v1/mydata')
@UseGuards(OidcJwtGuard)
export class MyDataController {
  constructor(
    @Inject(MyDataService) private readonly myDataService: MyDataService,
  ) {}

  @Post('/connections')
  @RequiredScopes('financial.write')
  async createConnection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers('x-correlation-id') traceId: string | undefined,
    @Body() body: CreateConnectionBody,
  ): Promise<ConnectionView> {
    if (
      typeof body.institutionCode !== 'string' ||
      typeof body.consentExpiresAt !== 'string'
    ) {
      throw new BadRequestException(
        problem(400, 'VALIDATION_FAILED', 'Connection request is invalid.'),
      );
    }
    try {
      return await this.myDataService.createConnection(
        principal,
        body.institutionCode,
        body.consentExpiresAt,
        traceId,
      );
    } catch (error: unknown) {
      if (error instanceof MyDataInputError) {
        throw new BadRequestException(
          problem(400, 'VALIDATION_FAILED', error.message),
        );
      }
      if (error instanceof MyDataConnectionConflictError) {
        throw new ConflictException(
          problem(
            409,
            'MYDATA_CONNECTION_ALREADY_EXISTS',
            'An active connection already exists for this institution.',
          ),
        );
      }
      throw error;
    }
  }

  @Get('/connections')
  @RequiredScopes('financial.read')
  listConnections(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<readonly ConnectionView[]> {
    return this.myDataService.listConnections(principal);
  }

  @Post('/syncs')
  @HttpCode(202)
  @RequiredScopes('financial.write')
  async createSync(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers('x-correlation-id') traceId: string | undefined,
    @Body() body: CreateSyncBody,
    @Res({ passthrough: true }) response: StatusReply,
  ): Promise<SyncView> {
    if (typeof body.connectionId !== 'string') {
      throw new BadRequestException(
        problem(400, 'VALIDATION_FAILED', 'Sync request is invalid.'),
      );
    }
    try {
      const result = await this.myDataService.createSync(
        principal,
        body.connectionId,
        traceId,
      );
      response.status(result.created ? 202 : 200);
      return result.sync;
    } catch (error: unknown) {
      if (error instanceof MyDataResourceNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      throw error;
    }
  }

  @Get('/syncs/:syncId')
  @RequiredScopes('financial.read')
  async getSync(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('syncId') syncId: string,
  ): Promise<SyncView> {
    try {
      return await this.myDataService.getSync(principal, syncId);
    } catch (error: unknown) {
      if (error instanceof MyDataResourceNotFoundError) {
        throw new NotFoundException(
          problem(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.'),
        );
      }
      throw error;
    }
  }
}
