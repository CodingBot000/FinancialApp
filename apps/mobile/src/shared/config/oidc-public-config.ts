export const OIDC_SCOPES = ['openid', 'profile', 'offline_access'] as const;
export const OIDC_REDIRECT_PATH = 'oauth/callback';
export const OIDC_REDIRECT_SCHEME = 'wealthsandbox';

export type OidcPublicConfig = Readonly<{
  clientId: string;
  issuer: string;
  scopes: readonly string[];
}>;

export type OidcPublicConfigState =
  | Readonly<{ config: OidcPublicConfig; status: 'configured' }>
  | Readonly<{
      invalid: readonly ('clientId' | 'issuer')[];
      missing: readonly ('clientId' | 'issuer')[];
      status: 'unavailable';
    }>;

type PublicEnvironment = Readonly<Record<string, string | undefined>>;

function isAllowedIssuer(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') {
      return true;
    }

    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function readOidcPublicConfig(
  environment: PublicEnvironment = process.env,
): OidcPublicConfigState {
  const clientId = environment.EXPO_PUBLIC_OIDC_CLIENT_ID?.trim() ?? '';
  const issuer = environment.EXPO_PUBLIC_OIDC_ISSUER?.trim() ?? '';
  const missing: ('clientId' | 'issuer')[] = [];
  const invalid: ('clientId' | 'issuer')[] = [];

  if (clientId.length === 0) {
    missing.push('clientId');
  }
  if (issuer.length === 0) {
    missing.push('issuer');
  } else if (!isAllowedIssuer(issuer)) {
    invalid.push('issuer');
  }

  if (missing.length > 0 || invalid.length > 0) {
    return { invalid, missing, status: 'unavailable' };
  }

  return {
    config: {
      clientId,
      issuer: issuer.replace(/\/$/, ''),
      scopes: OIDC_SCOPES,
    },
    status: 'configured',
  };
}
