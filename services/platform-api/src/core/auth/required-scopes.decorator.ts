import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPES_METADATA = 'finapp.requiredScopes';

export const RequiredScopes = (
  ...scopes: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_SCOPES_METADATA, scopes);
