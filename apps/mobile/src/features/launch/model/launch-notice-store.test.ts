import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => secureStore);

import { createSecureLaunchNoticeStore } from './launch-notice-store';

describe('LaunchNoticeStore biometric setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
    secureStore.getItemAsync.mockResolvedValue(null);
    secureStore.setItemAsync.mockResolvedValue(undefined);
  });

  it('persists and reads only the biometric setup completion marker', async () => {
    const store = createSecureLaunchNoticeStore();
    expect(await store.hasCompletedBiometricSetup()).toBe(false);

    await store.markBiometricSetupCompleted();
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'wealth-flow.biometric-setup-completed.v1',
      'true',
    );

    secureStore.getItemAsync.mockResolvedValue('true');
    expect(await store.hasCompletedBiometricSetup()).toBe(true);
  });

  it('fails closed when the biometric completion marker cannot be saved', async () => {
    const store = createSecureLaunchNoticeStore();
    secureStore.setItemAsync.mockRejectedValue(
      new Error('storage unavailable'),
    );

    await expect(store.markBiometricSetupCompleted()).rejects.toThrow(
      'storage unavailable',
    );
  });

  it('stores permission flow completion independently from permission results', async () => {
    const store = createSecureLaunchNoticeStore();
    expect(await store.hasHandledPermissions()).toBe(false);

    await store.markPermissionsHandled();
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'wealth-flow.launch-permissions-handled.v1',
      'true',
    );

    secureStore.getItemAsync.mockResolvedValue('true');
    expect(await store.hasHandledPermissions()).toBe(true);
  });

  it('clears every portfolio launch marker', async () => {
    const store = createSecureLaunchNoticeStore();
    await store.clearPortfolioSetup();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(5);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      'wealth-flow.biometric-setup-completed.v1',
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      'wealth-flow.launch-permissions-handled.v1',
    );
  });
});
