const keycloakBase = (
  process.env.FINAPP_LOCAL_KEYCLOAK_URL ?? 'http://localhost:8083'
).replace(/\/$/, '');
const adminPassword = process.env.FINAPP_KEYCLOAK_ADMIN_PASSWORD;
const username =
  process.env.FINAPP_LOCAL_OIDC_TEST_USERNAME ?? 'synthetic-investor';
const password = process.env.FINAPP_LOCAL_OIDC_TEST_PASSWORD;
const displayName =
  process.env.FINAPP_LOCAL_OIDC_TEST_DISPLAY_NAME ?? '합성 테스트 사용자';

if (!adminPassword || !password) {
  throw new Error(
    'FINAPP_KEYCLOAK_ADMIN_PASSWORD and FINAPP_LOCAL_OIDC_TEST_PASSWORD are required.',
  );
}

async function json(response, context) {
  if (!response.ok) {
    throw new Error(`${context} failed with HTTP ${response.status}.`);
  }
  const body = await response.text();
  return body.length === 0 ? undefined : JSON.parse(body);
}

const token = await json(
  await fetch(`${keycloakBase}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 'admin-cli',
      grant_type: 'password',
      password: adminPassword,
      username: 'finapp_admin',
    }),
  }),
  'Keycloak admin token',
);
if (typeof token?.access_token !== 'string') {
  throw new Error('Keycloak admin token response is invalid.');
}
const headers = {
  authorization: `Bearer ${token.access_token}`,
  'content-type': 'application/json',
};

const clients = await json(
  await fetch(
    `${keycloakBase}/admin/realms/finapp/clients?clientId=finapp-mobile`,
    { headers },
  ),
  'Keycloak mobile client lookup',
);
const clientUuid = clients?.[0]?.id;
let clientScopes = await json(
  await fetch(`${keycloakBase}/admin/realms/finapp/client-scopes`, { headers }),
  'Keycloak client scope lookup',
);
if (!clientScopes.some((scope) => scope.name === 'basic')) {
  await json(
    await fetch(`${keycloakBase}/admin/realms/finapp/client-scopes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        attributes: {
          'display.on.consent.screen': 'false',
          'include.in.token.scope': 'false',
        },
        name: 'basic',
        protocol: 'openid-connect',
        protocolMappers: [
          {
            config: {
              'access.token.claim': 'true',
              'introspection.token.claim': 'true',
              'lightweight.claim': 'true',
            },
            consentRequired: false,
            name: 'sub',
            protocol: 'openid-connect',
            protocolMapper: 'oidc-sub-mapper',
          },
        ],
      }),
    }),
    'Keycloak basic subject scope creation',
  );
  clientScopes = await json(
    await fetch(`${keycloakBase}/admin/realms/finapp/client-scopes`, {
      headers,
    }),
    'Keycloak updated client scope lookup',
  );
}
const offlineScopeUuid = clientScopes?.find(
  (scope) => scope.name === 'offline_access',
)?.id;
const basicScopeUuid = clientScopes?.find(
  (scope) => scope.name === 'basic',
)?.id;
if (
  typeof clientUuid !== 'string' ||
  typeof offlineScopeUuid !== 'string' ||
  typeof basicScopeUuid !== 'string'
) {
  throw new Error(
    'Keycloak mobile client or required client scope is missing.',
  );
}
await json(
  await fetch(
    `${keycloakBase}/admin/realms/finapp/clients/${encodeURIComponent(clientUuid)}/default-client-scopes/${encodeURIComponent(basicScopeUuid)}`,
    { method: 'PUT', headers },
  ),
  'Keycloak basic subject scope assignment',
);
await json(
  await fetch(
    `${keycloakBase}/admin/realms/finapp/clients/${encodeURIComponent(clientUuid)}/optional-client-scopes/${encodeURIComponent(offlineScopeUuid)}`,
    { method: 'PUT', headers },
  ),
  'Keycloak offline access scope assignment',
);

let users = await json(
  await fetch(
    `${keycloakBase}/admin/realms/finapp/users?exact=true&username=${encodeURIComponent(username)}`,
    { headers },
  ),
  'Keycloak user lookup',
);
if (!Array.isArray(users) || users.length > 1) {
  throw new Error('Synthetic Keycloak user lookup is ambiguous.');
}

if (users.length === 0) {
  await json(
    await fetch(`${keycloakBase}/admin/realms/finapp/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'synthetic-user@finapp.invalid',
        emailVerified: true,
        enabled: true,
        firstName: displayName,
        lastName: '사용자',
        username,
      }),
    }),
    'Keycloak user creation',
  );
  users = await json(
    await fetch(
      `${keycloakBase}/admin/realms/finapp/users?exact=true&username=${encodeURIComponent(username)}`,
      { headers },
    ),
    'Keycloak created user lookup',
  );
}

const userId = users[0]?.id;
if (typeof userId !== 'string') {
  throw new Error('Synthetic Keycloak user ID is missing.');
}
await json(
  await fetch(
    `${keycloakBase}/admin/realms/finapp/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        email: 'synthetic-user@finapp.invalid',
        emailVerified: true,
        enabled: true,
        firstName: displayName,
        lastName: '사용자',
        requiredActions: [],
        username,
      }),
    },
  ),
  'Keycloak synthetic user profile update',
);
await json(
  await fetch(
    `${keycloakBase}/admin/realms/finapp/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        temporary: false,
        type: 'password',
        value: password,
      }),
    },
  ),
  'Keycloak synthetic user password reset',
);

process.stdout.write(
  `${JSON.stringify({ realm: 'finapp', syntheticUser: username, userId })}\n`,
);
