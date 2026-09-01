import { Module } from '@nestjs/common';

import { OidcJwtGuard } from './oidc-jwt.guard.js';
import { AuditModule } from '../../modules/audit/audit.module.js';

@Module({
  exports: [OidcJwtGuard],
  imports: [AuditModule],
  providers: [OidcJwtGuard],
})
export class AuthModule {}
