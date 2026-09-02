import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { useStore } from 'zustand';

import {
  ExpoBiometricGate,
  LocalTestBiometricGate,
  type BiometricGate,
  useAuthSession,
  useSessionPresence,
} from '../../../shared/auth';
import {
  DEFAULT_APP_LOCK_TIMEOUT_MS,
  installAppLockLifecycle,
  type AppLockAppStatePort,
  type AppLockClock,
} from '../model/app-lock-lifecycle';
import {
  createAppLockStore,
  type AppLockNotice,
} from '../model/app-lock-store';
import { isLocalBiometricBypassEnabled } from '../../../shared/config';
import {
  AppText,
  APP_BRAND,
  Button,
  Card,
  Screen,
  colors,
} from '../../../shared/design-system';

const systemClock: AppLockClock = { now: Date.now };

type AppLockBoundaryProps = PropsWithChildren<{
  appState?: AppLockAppStatePort;
  biometricGate?: BiometricGate;
  clock?: AppLockClock;
  timeoutMs?: number;
}>;

function noticeMessage(notice: AppLockNotice | undefined) {
  switch (notice) {
    case 'authentication-failed':
      return '생체정보를 확인하지 못했습니다. 다시 시도해 주세요.';
    case 'cancelled':
      return '잠금 해제가 취소되었습니다.';
    case 'timed-out':
      return '인증 시간이 초과되었습니다. 다시 시도해 주세요.';
    case undefined:
      return undefined;
  }
}

function SessionInspectionScreen() {
  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <View
        accessibilityLabel="보안 세션 확인 중"
        style={{ alignItems: 'center', gap: 16 }}
      >
        <ActivityIndicator color={colors.brand.primary} size="large" />
        <AppText accessibilityRole="header" variant="title2">
          보안 세션을 확인하고 있습니다
        </AppText>
      </View>
    </Screen>
  );
}

function SessionInspectionUnavailableScreen({
  onRetry,
}: {
  readonly onRetry: () => void;
}) {
  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <View accessibilityLabel="보안 세션 확인 실패" style={{ gap: 16 }}>
        <AppText accessibilityRole="header" variant="title1">
          보안 세션을 확인할 수 없습니다
        </AppText>
        <AppText tone="secondary" variant="body">
          기기의 보안 저장소를 사용할 수 있는지 확인한 뒤 다시 시도해 주세요.
        </AppText>
        <Button accessibilityLabel="보안 세션 다시 확인" onPress={onRetry}>
          다시 확인
        </Button>
      </View>
    </Screen>
  );
}

function ActiveSessionAppLock({
  appState,
  biometricGate,
  children,
  clock,
  timeoutMs,
}: Required<Pick<AppLockBoundaryProps, 'appState' | 'clock' | 'timeoutMs'>> &
  PropsWithChildren<{ biometricGate: BiometricGate }>) {
  const manager = useAuthSession();
  const [store] = useState(createAppLockStore);
  const [endingSession, setEndingSession] = useState(false);
  const notice = useStore(store, (state) => state.notice);
  const phase = useStore(store, (state) => state.phase);

  useEffect(
    () =>
      installAppLockLifecycle({
        appState,
        clock,
        onTimeout: store.getState().lock,
        timeoutMs,
      }),
    [appState, clock, store, timeoutMs],
  );

  const unlock = useCallback(async () => {
    if (!store.getState().beginUnlock()) {
      return;
    }

    try {
      store.getState().resolveUnlock(await biometricGate.authenticate());
    } catch {
      store.getState().resolveUnlock({
        reason: 'system_error',
        status: 'reauthentication-required',
      });
    }
  }, [biometricGate, store]);

  const endSession = useCallback(async () => {
    setEndingSession(true);
    try {
      await manager.clear();
    } finally {
      setEndingSession(false);
    }
  }, [manager]);

  if (phase === 'unlocked') {
    return children;
  }

  const message = noticeMessage(notice);
  const requiresReauthentication = phase === 'reauthentication-required';

  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <View
        accessibilityLabel="앱 잠금"
        style={{ alignItems: 'center', gap: 16 }}
      >
        <AppText accessibilityRole="header" variant="title1">
          {requiresReauthentication
            ? '다시 로그인이 필요합니다'
            : '앱이 잠겨 있습니다'}
        </AppText>
        <AppText
          style={{ textAlign: 'center' }}
          tone="secondary"
          variant="body"
        >
          {requiresReauthentication
            ? '기기 생체인증을 사용할 수 없어 로컬 세션을 종료해야 합니다.'
            : `등록된 기기 생체정보로 ${APP_BRAND.displayName} 잠금을 해제하세요.`}
        </AppText>
        <Card variant="info">
          <AppText tone="secondary" variant="caption">
            생체인증은 이 기기 안에서만 앱 잠금을 해제합니다.
          </AppText>
        </Card>

        {message === undefined ? null : (
          <AppText accessibilityRole="alert" tone="danger" variant="body">
            {message}
          </AppText>
        )}

        {requiresReauthentication ? (
          <Button
            accessibilityLabel="로컬 세션 종료"
            disabled={endingSession}
            onPress={() => void endSession()}
            variant="secondary"
          >
            {endingSession ? '처리 중' : '로그인으로 돌아가기'}
          </Button>
        ) : (
          <Button
            accessibilityLabel="생체인증으로 앱 잠금 해제"
            disabled={phase === 'unlocking'}
            onPress={() => void unlock()}
            variant="brand"
          >
            {phase === 'unlocking' ? '확인 중' : '생체인증으로 잠금 해제'}
          </Button>
        )}
      </View>
    </Screen>
  );
}

export function AppLockBoundary({
  appState = AppState,
  biometricGate,
  children,
  clock = systemClock,
  timeoutMs = DEFAULT_APP_LOCK_TIMEOUT_MS,
}: AppLockBoundaryProps) {
  const manager = useAuthSession();
  const sessionPresence = useSessionPresence();
  const [defaultBiometricGate] = useState(() =>
    isLocalBiometricBypassEnabled()
      ? new LocalTestBiometricGate()
      : new ExpoBiometricGate(),
  );

  if (sessionPresence === 'unknown') {
    return <SessionInspectionScreen />;
  }

  if (sessionPresence === 'unavailable') {
    return (
      <SessionInspectionUnavailableScreen
        onRetry={() => void manager.inspectSessionPresence()}
      />
    );
  }

  if (sessionPresence === 'absent') {
    return children;
  }

  if (isLocalBiometricBypassEnabled()) {
    return children;
  }

  return (
    <ActiveSessionAppLock
      appState={appState}
      biometricGate={biometricGate ?? defaultBiometricGate}
      clock={clock}
      timeoutMs={timeoutMs}
    >
      {children}
    </ActiveSessionAppLock>
  );
}
