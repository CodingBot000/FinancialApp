import { describe, expect, it } from 'vitest';

import { isDeveloperToolsEnabled, readAppEnvironment } from './app-environment';

describe('app environment', () => {
  it.each(['local', 'demo'] as const)(
    'enables developer tools in %s',
    (value) => {
      expect(isDeveloperToolsEnabled({ EXPO_PUBLIC_APP_ENV: value })).toBe(
        true,
      );
      expect(readAppEnvironment({ EXPO_PUBLIC_APP_ENV: value })).toBe(value);
    },
  );

  it('fails closed for production, missing, and unknown values', () => {
    expect(isDeveloperToolsEnabled({ EXPO_PUBLIC_APP_ENV: 'production' })).toBe(
      false,
    );
    expect(isDeveloperToolsEnabled({})).toBe(false);
    expect(readAppEnvironment({ EXPO_PUBLIC_APP_ENV: 'preview' })).toBe(
      'production',
    );
  });
});
