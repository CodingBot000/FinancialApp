import { spawn, spawnSync } from 'node:child_process';

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('A command is required.');

const environment = { ...process.env };
if (!environment.DOCKER_HOST) {
  const context = spawnSync(
    'docker',
    ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'],
    { encoding: 'utf8' },
  );
  const host = context.status === 0 ? context.stdout.trim() : '';
  if (host.startsWith('unix://')) environment.DOCKER_HOST = host;
}
if (
  environment.DOCKER_HOST?.startsWith('unix://') &&
  environment.DOCKER_HOST !== 'unix:///var/run/docker.sock' &&
  !environment.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE
) {
  environment.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE = '/var/run/docker.sock';
}

const child = spawn(command, args, { env: environment, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', (error) => {
  throw error;
});
child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
