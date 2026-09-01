import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import {
  ExpoBiometricGate,
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
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="보안 세션 확인 중" style={styles.content}>
        <ActivityIndicator color="#39e8b5" size="large" />
        <Text accessibilityRole="header" style={styles.title}>
          보안 세션을 확인하고 있습니다
        </Text>
      </View>
    </SafeAreaView>
  );
}

function SessionInspectionUnavailableScreen({
  onRetry,
}: {
  readonly onRetry: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="보안 세션 확인 실패" style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          보안 세션을 확인할 수 없습니다
        </Text>
        <Text style={styles.description}>
          기기의 보안 저장소를 사용할 수 있는지 확인한 뒤 다시 시도해 주세요.
        </Text>
        <Pressable
          accessibilityLabel="보안 세션 다시 확인"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>다시 확인</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="앱 잠금" style={styles.content}>
        <View style={styles.lockMark}>
          <Text style={styles.lockGlyph}>●</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {requiresReauthentication
            ? '다시 로그인이 필요합니다'
            : '앱이 잠겨 있습니다'}
        </Text>
        <Text style={styles.description}>
          {requiresReauthentication
            ? '기기 생체인증을 사용할 수 없어 로컬 세션을 종료해야 합니다.'
            : '등록된 기기 생체정보로 Wealth Sandbox 잠금을 해제하세요.'}
        </Text>
        <Text style={styles.boundaryNotice}>
          생체인증은 이 기기 안에서만 앱 잠금을 해제하며 서버 MFA가 아닙니다.
        </Text>

        {message === undefined ? null : (
          <Text accessibilityRole="alert" style={styles.failureText}>
            {message}
          </Text>
        )}

        {requiresReauthentication ? (
          <Pressable
            accessibilityLabel="로컬 세션 종료"
            accessibilityRole="button"
            disabled={endingSession}
            onPress={() => void endSession()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {endingSession ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.primaryButtonText}>로그인으로 돌아가기</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="생체인증으로 앱 잠금 해제"
            accessibilityRole="button"
            disabled={phase === 'unlocking'}
            onPress={() => void unlock()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {phase === 'unlocking' ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.primaryButtonText}>
                생체인증으로 잠금 해제
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
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
  const [defaultBiometricGate] = useState(() => new ExpoBiometricGate());

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

const styles = StyleSheet.create({
  boundaryNotice: {
    color: '#718198',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 18,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  description: {
    color: '#aebbd0',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 360,
    textAlign: 'center',
  },
  failureText: {
    color: '#f8b4b4',
    fontSize: 14,
    marginTop: 18,
    textAlign: 'center',
  },
  lockGlyph: {
    color: '#39e8b5',
    fontSize: 22,
  },
  lockMark: {
    alignItems: 'center',
    backgroundColor: '#10283a',
    borderColor: '#24566a',
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: 28,
    width: 72,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#39e8b5',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 30,
    minHeight: 52,
    minWidth: 260,
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: '#07111f',
    fontSize: 15,
    fontWeight: '800',
  },
  safeArea: {
    backgroundColor: '#07111f',
    flex: 1,
  },
  title: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
});
