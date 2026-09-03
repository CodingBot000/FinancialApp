import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppText, Button } from '../../../shared/design-system';
import type { LaunchNoticeStore } from '../model/launch-notice-store';
import { AppLaunchBoundary } from './app-launch-boundary';

vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-splash-screen', () => ({
  hideAsync: vi.fn(() => Promise.resolve()),
  preventAutoHideAsync: vi.fn(() => Promise.resolve()),
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  setItemAsync: vi.fn(() => Promise.resolve()),
}));

describe('AppLaunchBoundary', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function createStore(
    seen: boolean,
    onboardingCompleted = seen,
    verificationCompleted = seen,
    biometricCompleted = seen,
  ): LaunchNoticeStore {
    return {
      clearPortfolioSetup: vi.fn(async () => undefined),
      hasCompletedBiometricSetup: vi.fn(async () => biometricCompleted),
      hasCompletedOnboarding: vi.fn(async () => onboardingCompleted),
      hasCompletedVerification: vi.fn(async () => verificationCompleted),
      hasSeen: vi.fn(async () => seen),
      markBiometricSetupCompleted: vi.fn(async () => undefined),
      markOnboardingCompleted: vi.fn(async () => undefined),
      markVerificationCompleted: vi.fn(async () => undefined),
      markSeen: vi.fn(async () => undefined),
    };
  }

  it('holds the full-screen WM splash for the configured duration', async () => {
    vi.useFakeTimers();
    const store = createStore(true);
    const view = await render(
      <AppLaunchBoundary durationMs={1000} noticeStore={store}>
        <AppText>다음 화면</AppText>
      </AppLaunchBoundary>,
    );

    expect(view.getByLabelText('WM 로고')).toBeTruthy();
    expect(view.queryByText('다음 화면')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(999);
    });
    expect(view.getByLabelText('WM 로고')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.getByText('다음 화면')).toBeTruthy();
    expect(view.queryByText('WM')).toBeNull();
  });

  it('shows the permission sheet once and continues after confirmation', async () => {
    vi.useFakeTimers();
    const store = createStore(false);
    const view = await render(
      <AppLaunchBoundary
        durationMs={1000}
        noticeStore={store}
        onboarding={(onComplete) => (
          <Button onPress={onComplete}>온보딩 완료</Button>
        )}
      >
        <AppText>다음 화면</AppText>
      </AppLaunchBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.getByText('접근 권한 안내')).toBeTruthy();
    expect(view.getByText('확인')).toBeTruthy();
    expect(view.queryByText('다음 화면')).toBeNull();

    await act(async () => {
      view.getByRole('button', { name: '접근 권한 안내 확인' }).props.onPress();
      await Promise.resolve();
    });
    expect(store.markSeen).toHaveBeenCalledOnce();
    expect(view.getByText('온보딩 완료')).toBeTruthy();

    await act(async () => {
      view.getByRole('button', { name: '온보딩 완료' }).props.onPress();
      await Promise.resolve();
    });
    expect(store.markOnboardingCompleted).toHaveBeenCalledOnce();
    expect(view.getByText('다음 화면')).toBeTruthy();
  });

  it('presents verification after onboarding and persists completion', async () => {
    vi.useFakeTimers();
    const store = createStore(true, false, false);
    const view = await render(
      <AppLaunchBoundary
        durationMs={1000}
        noticeStore={store}
        onboarding={(onComplete) => (
          <Button onPress={onComplete}>온보딩 완료</Button>
        )}
        verification={(onComplete) => (
          <Button onPress={onComplete}>본인인증 완료</Button>
        )}
      >
        <AppText>다음 화면</AppText>
      </AppLaunchBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.getByText('온보딩 완료')).toBeTruthy();

    await act(async () => {
      view.getByRole('button', { name: '온보딩 완료' }).props.onPress();
      await Promise.resolve();
    });
    expect(view.getByText('본인인증 완료')).toBeTruthy();
    expect(view.queryByText('다음 화면')).toBeNull();

    await act(async () => {
      view.getByRole('button', { name: '본인인증 완료' }).props.onPress();
      await Promise.resolve();
    });
    expect(store.markVerificationCompleted).toHaveBeenCalledOnce();
    expect(view.getByText('다음 화면')).toBeTruthy();
  });

  it('persists biometric setup after verification before showing content', async () => {
    vi.useFakeTimers();
    const store = createStore(true, true, false, false);
    const view = await render(
      <AppLaunchBoundary
        biometric={(_, onAuthenticated) => (
          <Button onPress={() => void onAuthenticated()}>생체인증 완료</Button>
        )}
        durationMs={1000}
        noticeStore={store}
        verification={(onComplete) => (
          <Button onPress={onComplete}>본인인증 완료</Button>
        )}
      >
        <AppText>홈</AppText>
      </AppLaunchBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.getByText('본인인증 완료')).toBeTruthy();

    await act(async () => {
      view.getByRole('button', { name: '본인인증 완료' }).props.onPress();
      await Promise.resolve();
    });
    expect(view.getByText('생체인증 완료')).toBeTruthy();
    expect(view.queryByText('홈')).toBeNull();

    await act(async () => {
      view.getByRole('button', { name: '생체인증 완료' }).props.onPress();
      await Promise.resolve();
    });
    expect(store.markBiometricSetupCompleted).toHaveBeenCalledOnce();
    expect(view.getByText('홈')).toBeTruthy();
  });

  it('reauthenticates on a returning launch without mounting onboarding', async () => {
    vi.useFakeTimers();
    const store = createStore(true, true, true, true);
    const view = await render(
      <AppLaunchBoundary
        biometric={(mode, onAuthenticated) => (
          <Button onPress={() => void onAuthenticated()}>
            {mode === 'unlock' ? '재실행 인증' : '최초 인증'}
          </Button>
        )}
        durationMs={1000}
        noticeStore={store}
        onboarding={() => <AppText>온보딩</AppText>}
        verification={() => <AppText>본인인증</AppText>}
      >
        <AppText>홈</AppText>
      </AppLaunchBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.getByText('재실행 인증')).toBeTruthy();
    expect(view.queryByText('온보딩')).toBeNull();
    expect(view.queryByText('본인인증')).toBeNull();

    await act(async () => {
      view.getByRole('button', { name: '재실행 인증' }).props.onPress();
      await Promise.resolve();
    });
    expect(view.getByText('홈')).toBeTruthy();
    expect(store.markBiometricSetupCompleted).not.toHaveBeenCalled();
  });

  it('skips the permission sheet after it has been seen', async () => {
    vi.useFakeTimers();
    const store = createStore(true);
    const view = await render(
      <AppLaunchBoundary durationMs={1000} noticeStore={store}>
        <AppText>다음 화면</AppText>
      </AppLaunchBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.queryByText('접근 권한 안내')).toBeNull();
    expect(view.getByText('다음 화면')).toBeTruthy();
  });

  it('dismisses the permission sheet on Android back without acknowledging it', async () => {
    vi.useFakeTimers();
    const store = createStore(false);
    const addEventListener = vi.spyOn(BackHandler, 'addEventListener');
    const view = await render(
      <AppLaunchBoundary
        durationMs={1000}
        noticeStore={store}
        onboarding={(onComplete) => (
          <Button onPress={onComplete}>온보딩 시작</Button>
        )}
      >
        <AppText>다음 화면</AppText>
      </AppLaunchBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    const backHandler = addEventListener.mock.calls.at(-1)?.[1] as
      (() => boolean) | undefined;
    expect(backHandler).toBeDefined();
    await act(async () => {
      expect(backHandler?.()).toBe(true);
      await Promise.resolve();
    });

    expect(store.markSeen).not.toHaveBeenCalled();
    expect(view.getByText('온보딩 시작')).toBeTruthy();
  });
});
