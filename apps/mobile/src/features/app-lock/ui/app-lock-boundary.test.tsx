import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-local-authentication', () => ({
  authenticateAsync: vi.fn(),
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
}));
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import { MemoryAccessTokenStore } from '../../../shared/auth';
import type { BiometricGate } from '../../../shared/auth';
import { AuthSessionProvider } from '../../../shared/auth';
import { AuthSessionManager } from '../../../shared/auth';
import type { RefreshTokenStore } from '../../../shared/auth';
import { AppLockBoundary } from './app-lock-boundary';

class MemoryRefreshTokenStore implements RefreshTokenStore {
  token: string | undefined;

  async clear() {
    this.token = undefined;
  }

  async read() {
    return this.token;
  }

  async write(token: string) {
    this.token = token;
  }
}

async function createActiveSessionManager() {
  const manager = new AuthSessionManager(
    new MemoryAccessTokenStore(),
    new MemoryRefreshTokenStore(),
  );
  await manager.establish({
    accessToken: 'example-access-token',
    refreshToken: 'example-refresh-token',
  });
  return manager;
}

describe('AppLockBoundary', () => {
  it('keeps active-session content hidden until local biometrics succeed', async () => {
    const manager = await createActiveSessionManager();
    const authenticate = vi.fn().mockResolvedValue({ status: 'authenticated' });
    const biometricGate: BiometricGate = { authenticate };
    const view = await render(
      <AuthSessionProvider manager={manager}>
        <AppLockBoundary biometricGate={biometricGate}>
          <Text>보호된 화면</Text>
        </AppLockBoundary>
      </AuthSessionProvider>,
    );

    expect(view.queryByText('보호된 화면')).toBeNull();
    fireEvent.press(
      view.getByRole('button', {
        name: '생체인증으로 앱 잠금 해제',
      }),
    );

    expect(await view.findByText('보호된 화면')).toBeTruthy();
    expect(authenticate).toHaveBeenCalledOnce();
  });

  it('renders a retryable cancellation without revealing content', async () => {
    const manager = await createActiveSessionManager();
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    };
    const view = await render(
      <AuthSessionProvider manager={manager}>
        <AppLockBoundary biometricGate={biometricGate}>
          <Text>보호된 화면</Text>
        </AppLockBoundary>
      </AuthSessionProvider>,
    );

    fireEvent.press(
      view.getByRole('button', {
        name: '생체인증으로 앱 잠금 해제',
      }),
    );

    expect(await view.findByRole('alert')).toHaveTextContent(
      '잠금 해제가 취소되었습니다.',
    );
    expect(view.queryByText('보호된 화면')).toBeNull();
  });

  it('clears the local session when device enrollment requires login', async () => {
    const manager = await createActiveSessionManager();
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({
        reason: 'not_enrolled',
        status: 'reauthentication-required',
      }),
    };
    const view = await render(
      <AuthSessionProvider manager={manager}>
        <AppLockBoundary biometricGate={biometricGate}>
          <Text>로그인 화면</Text>
        </AppLockBoundary>
      </AuthSessionProvider>,
    );

    fireEvent.press(
      view.getByRole('button', {
        name: '생체인증으로 앱 잠금 해제',
      }),
    );
    fireEvent.press(
      await view.findByRole('button', { name: '로컬 세션 종료' }),
    );

    await waitFor(() => {
      expect(manager.getSessionPresence()).toBe('absent');
    });
    expect(await view.findByText('로그인 화면')).toBeTruthy();
  });
});
