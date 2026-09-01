import { Module } from '@nestjs/common';

import { OidcJwtGuard } from './oidc-jwt.guard.js';

@Module({
  exports: [OidcJwtGuard],
  providers: [OidcJwtGuard],
})
export class AuthModule {}
