export interface AuthenticatedPrincipal {
  readonly issuer: string;
  readonly subject: string;
  readonly scopes: ReadonlySet<string>;
}
