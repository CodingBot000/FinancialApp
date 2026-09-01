import type { CurrentUser } from '../../domain/current-user.js';

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY');

export interface IdentityRepository {
  provisionFromOidc(issuer: string, subject: string): Promise<CurrentUser>;
}
