type PublicEnvironment = Readonly<Record<string, string | undefined>>;

export type AppEnvironment = 'demo' | 'local' | 'production';

export function readAppEnvironment(
  environment?: PublicEnvironment,
): AppEnvironment {
  const value =
    environment === undefined
      ? process.env.EXPO_PUBLIC_APP_ENV
      : environment.EXPO_PUBLIC_APP_ENV;
  return value === 'local' || value === 'demo' ? value : 'production';
}

export function isDeveloperToolsEnabled(environment?: PublicEnvironment) {
  return readAppEnvironment(environment) !== 'production';
}

export function isLocalTestLoginEnabled(environment?: PublicEnvironment) {
  const source = environment ?? process.env;
  return (
    readAppEnvironment(source) === 'local' &&
    source.EXPO_PUBLIC_LOGIN_MODE === 'test'
  );
}
