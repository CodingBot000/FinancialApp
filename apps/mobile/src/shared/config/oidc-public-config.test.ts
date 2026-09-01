import { describe, expect, it } from 'vitest';

import { readOidcPublicConfig } from './oidc-public-config';

describe('OIDC public config', () => {
  it('requires issuer and public client id without a client secret', () => {
    expect(readOidcPublicConfig({})).toEqual({
      invalid: [],
      missing: ['clientId', 'issuer'],
      status: 'unavailable',
    });
  });

  it('accepts HTTPS providers and applies required OIDC scopes', () => {
    expect(
      readOidcPublicConfig({
        EXPO_PUBLIC_OIDC_CLIENT_ID: 'wealth-sandbox-mobile',
        EXPO_PUBLIC_OIDC_ISSUER: 'https://identity.example/realms/sandbox/',
      }),
    ).toEqual({
      config: {
        clientId: 'wealth-sandbox-mobile',
        issuer: 'https://identity.example/realms/sandbox',
        scopes: ['openid', 'offline_access'],
      },
      status: 'configured',
    });
  });

  it('allows HTTP only for local development issuers', () => {
    expect(
      readOidcPublicConfig({
        EXPO_PUBLIC_OIDC_CLIENT_ID: 'wealth-sandbox-mobile',
        EXPO_PUBLIC_OIDC_ISSUER: 'http://localhost:8080/realms/sandbox',
      }).status,
    ).toBe('configured');
    expect(
      readOidcPublicConfig({
        EXPO_PUBLIC_OIDC_CLIENT_ID: 'wealth-sandbox-mobile',
        EXPO_PUBLIC_OIDC_ISSUER: 'http://identity.example/realms/sandbox',
      }),
    ).toEqual({
      invalid: ['issuer'],
      missing: [],
      status: 'unavailable',
    });
  });
});
