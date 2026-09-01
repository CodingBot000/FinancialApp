export type OidcAuthorizedTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

export type OidcAuthorizationResult =
  | Readonly<{ status: 'cancelled' }>
  | Readonly<{ status: 'authorized'; tokens: OidcAuthorizedTokens }>;

export interface OidcAuthorizationPort {
  authorize(): Promise<OidcAuthorizationResult>;
}

export type OidcAuthorizationErrorCode =
  | 'authorization_failed'
  | 'authorization_response_invalid'
  | 'discovery_failed'
  | 'refresh_failed'
  | 'refresh_token_required'
  | 'token_exchange_failed';

export class OidcAuthorizationError extends Error {
  readonly code: OidcAuthorizationErrorCode;

  constructor(code: OidcAuthorizationErrorCode, options?: ErrorOptions) {
    super(`OIDC session operation failed: ${code}`, options);
    this.name = 'OidcAuthorizationError';
    this.code = code;
  }
}
