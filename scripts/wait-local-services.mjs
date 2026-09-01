const services = [
  ['platform-api', 'http://127.0.0.1:8081/api/v1/health'],
  ['institution-simulator', 'http://127.0.0.1:8082/sim/v1/health'],
  [
    'keycloak',
    'http://127.0.0.1:8083/realms/finapp/.well-known/openid-configuration',
  ],
];
const timeoutMs = 90_000;

async function waitFor([name, url]) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return name;
    } catch {
      // A local container can accept and close sockets during startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${name} did not become ready within ${timeoutMs}ms.`);
}

const ready = await Promise.all(services.map(waitFor));
process.stdout.write(
  `${JSON.stringify({ localServicesReady: ready, remoteResourcesUsed: false })}\n`,
);
