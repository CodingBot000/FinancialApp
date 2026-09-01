import { createHash, randomBytes } from 'node:crypto';

import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = (
  process.env.EXPO_PUBLIC_OIDC_ISSUER ?? 'http://localhost:8083/realms/finapp'
).replace(/\/$/, '');
const clientId = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? 'finapp-mobile';
const platformBase = (
  process.env.EXPO_PUBLIC_PLATFORM_API_URL ?? 'http://localhost:8081'
).replace(/\/$/, '');
const username =
  process.env.FINAPP_LOCAL_OIDC_TEST_USERNAME ?? 'synthetic-investor';
const password = process.env.FINAPP_LOCAL_OIDC_TEST_PASSWORD;
const redirectUri = 'wealthsandbox://oauth/callback';

if (!password) {
  throw new Error('FINAPP_LOCAL_OIDC_TEST_PASSWORD is required.');
}

const cookies = new Map();
function rememberCookies(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  for (const value of values) {
    const pair = value.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator > 0)
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}
function cookieHeader() {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}
function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&#x3D;', '=');
}
async function request(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
    headers: {
      ...(cookies.size === 0 ? {} : { cookie: cookieHeader() }),
      ...(init.headers ?? {}),
    },
  });
  rememberCookies(response);
  return response;
}
async function tokenRequest(parameters) {
  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(parameters),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OIDC token request failed with HTTP ${response.status}.`);
  }
  return payload;
}
async function currentUser(accessToken, expected = 200) {
  const response = await fetch(`${platformBase}/api/v1/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (response.status !== expected) {
    throw new Error(
      `/me returned HTTP ${response.status} (${String(body.code ?? 'unknown')}).`,
    );
  }
  return body;
}
function tokenBoundary(accessToken) {
  const payload = accessToken.split('.')[1];
  if (!payload) throw new Error('OIDC access token is not a JWT.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return {
    audience: claims.aud,
    hasSubject: typeof claims.sub === 'string' && claims.sub.length > 0,
    issuer: claims.iss,
    scope: claims.scope,
  };
}

const verifier = randomBytes(48).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(24).toString('base64url');
const authorization = new URL(`${issuer}/protocol/openid-connect/auth`);
authorization.search = new URLSearchParams({
  client_id: clientId,
  code_challenge: challenge,
  code_challenge_method: 'S256',
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'openid offline_access',
  state,
}).toString();

const loginPage = await request(authorization);
if (!loginPage.ok)
  throw new Error(`OIDC login page returned ${loginPage.status}.`);
const html = await loginPage.text();
const formAction = html.match(/<form[^>]+action="([^"]+)"/i)?.[1];
if (!formAction) throw new Error('OIDC login form action was not found.');

let callback = await request(decodeHtml(formAction), {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ password, username }),
});
for (let redirects = 0; redirects < 5; redirects += 1) {
  const location = callback.headers.get('location');
  if (!location) break;
  if (location.startsWith(redirectUri)) {
    callback = { location };
    break;
  }
  callback = await request(new URL(location, issuer));
}
if (!('location' in callback) || !callback.location.startsWith(redirectUri)) {
  const responseBody =
    callback instanceof Response ? await callback.text() : '';
  const feedback = responseBody
    .match(
      /<(?:span|div)[^>]+(?:id="input-error"|class="[^"]*pf-v5-c-alert[^"']*")[^>]*>([\s\S]*?)<\/(?:span|div)>/i,
    )?.[1]
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const pageTitle = responseBody
    .match(/<title>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim();
  const formId = responseBody.match(/<form[^>]+id="([^"]+)"/i)?.[1];
  const diagnostic =
    callback instanceof Response
      ? `HTTP ${callback.status}, location=${callback.headers.get('location') ?? 'none'}, title=${pageTitle ?? 'none'}, form=${formId ?? 'none'}, feedback=${feedback ?? 'none'}`
      : 'non-HTTP callback';
  throw new Error(
    `OIDC flow did not return to the registered app callback (${diagnostic}).`,
  );
}
const callbackUrl = new URL(callback.location);
if (callbackUrl.searchParams.get('state') !== state) {
  throw new Error('OIDC callback state mismatch.');
}
const code = callbackUrl.searchParams.get('code');
if (!code) throw new Error('OIDC callback code is missing.');

const tokens = await tokenRequest({
  client_id: clientId,
  code,
  code_verifier: verifier,
  grant_type: 'authorization_code',
  redirect_uri: redirectUri,
});
if (
  typeof tokens.access_token !== 'string' ||
  typeof tokens.refresh_token !== 'string'
) {
  throw new Error('OIDC authorization tokens are incomplete.');
}
const boundary = tokenBoundary(tokens.access_token);
const audiences = Array.isArray(boundary.audience)
  ? boundary.audience
  : [boundary.audience];
if (
  boundary.issuer !== issuer ||
  boundary.hasSubject !== true ||
  !audiences.includes('finapp-platform-api') ||
  !String(boundary.scope).split(' ').includes('financial.read')
) {
  throw new Error(
    `OIDC access token boundary mismatch: ${JSON.stringify(boundary)}`,
  );
}
await jwtVerify(
  tokens.access_token,
  createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`)),
  { audience: 'finapp-platform-api', issuer },
);
const initialUser = await currentUser(tokens.access_token);

const restarted = await tokenRequest({
  client_id: clientId,
  grant_type: 'refresh_token',
  refresh_token: tokens.refresh_token,
});
if (
  typeof restarted.access_token !== 'string' ||
  typeof restarted.refresh_token !== 'string'
) {
  throw new Error('OIDC restart refresh tokens are incomplete.');
}
const restartedUser = await currentUser(restarted.access_token);
if (restartedUser.userId !== initialUser.userId) {
  throw new Error('OIDC refresh resolved another application user.');
}

const invalid = await currentUser(`${restarted.access_token}invalid`, 401);
if (invalid.code !== 'AUTH_TOKEN_INVALID') {
  throw new Error('Invalid token did not fail closed.');
}

const logout = await fetch(`${issuer}/protocol/openid-connect/logout`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    refresh_token: restarted.refresh_token,
  }),
});
if (!logout.ok) throw new Error(`OIDC logout returned ${logout.status}.`);
const refreshAfterLogout = await fetch(
  `${issuer}/protocol/openid-connect/token`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: restarted.refresh_token,
    }),
  },
);
if (refreshAfterLogout.ok) {
  throw new Error('Revoked refresh token remained usable after logout.');
}

process.stdout.write(
  `${JSON.stringify({ callback: redirectUri, refreshRestart: true, syntheticData: initialUser.syntheticData, userId: initialUser.userId })}\n`,
);
