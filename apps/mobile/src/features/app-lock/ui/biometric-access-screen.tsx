import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import type { BiometricGateResult } from '../../../shared/auth/biometric-gate';
import { usePortfolioAccess } from '../../../shared/auth/portfolio-access-context';
import {
  AppText,
  APP_BRAND,
  Button,
  Card,
  Screen,
  colors,
} from '../../../shared/design-system';

export type BiometricAccessMode = 'setup' | 'unlock';

function resultMessage(result: BiometricGateResult | undefined) {
  if (result === undefined || result.status === 'authenticated')
    return undefined;
  if (result.status === 'cancelled')
    return '생체인증이 취소되었습니다. 준비되면 다시 시도해 주세요.';
  if (result.status === 'retryable-failure')
    return result.reason === 'timeout'
      ? '인증 시간이 초과되었습니다. 다시 시도해 주세요.'
      : '생체정보를 확인하지 못했습니다. 다시 시도해 주세요.';

  switch (result.reason) {
    case 'not_enrolled':
      return '기기에 생체정보가 등록되어 있지 않습니다. 기기 설정에서 등록한 뒤 다시 시도해 주세요.';
    case 'not_available':
      return '이 기기에서는 생체인증을 사용할 수 없습니다.';
    case 'locked_out':
      return '생체인증이 잠겨 있습니다. 기기 잠금을 해제한 뒤 다시 시도해 주세요.';
    case 'fallback_requested':
      return '생체인증 대신 다른 인증 방식이 선택되었습니다. 다시 시도해 주세요.';
    case 'system_error':
      return '기기 생체인증을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
}

export function BiometricAccessScreen({
  autoStart = true,
  mode,
  onAuthenticated,
}: {
  readonly autoStart?: boolean;
  readonly mode: BiometricAccessMode;
  readonly onAuthenticated?: () => Promise<void> | void;
}) {
  const access = usePortfolioAccess();
  const autoStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const [completionError, setCompletionError] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const authenticate = useCallback(async () => {
    if (finishing) return;
    setCompletionError(false);
    const result = await access.authenticate();
    if (result.status !== 'authenticated') return;

    setFinishing(true);
    try {
      await onAuthenticated?.();
    } catch {
      access.lock();
      if (mountedRef.current) setCompletionError(true);
    } finally {
      if (mountedRef.current) setFinishing(false);
    }
  }, [access, finishing, onAuthenticated]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;

    const start = () => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      void authenticate();
    };

    if (AppState.currentState === 'active') {
      start();
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') start();
    });
    return () => subscription.remove();
  }, [authenticate, autoStart]);

  const pending = access.state.phase === 'authenticating' || finishing;
  const message = completionError
    ? '인증 완료 상태를 기기에 저장하지 못했습니다. 다시 시도해 주세요.'
    : resultMessage(access.state.lastResult);

  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <View
        accessibilityLabel={
          mode === 'setup' ? '생체인증 설정' : '생체인증 잠금 해제'
        }
        style={{ alignItems: 'center', gap: 16 }}
      >
        {pending ? (
          <ActivityIndicator color={colors.brand.primary} size="large" />
        ) : null}
        <AppText accessibilityRole="header" variant="title1">
          {mode === 'setup'
            ? '생체인증을 등록해주세요'
            : `${APP_BRAND.displayName} 잠금 해제`}
        </AppText>
        <AppText
          style={{ textAlign: 'center' }}
          tone="secondary"
          variant="body"
        >
          {mode === 'setup'
            ? '기기에 등록된 생체정보로 안전하고 간편하게 시작하세요.'
            : '등록된 기기 생체정보로 앱 잠금을 해제하세요.'}
        </AppText>
        <Card variant="info">
          <AppText tone="secondary" variant="caption">
            생체정보는 기기에서 확인되며 앱이나 서버에 저장되지 않습니다.
          </AppText>
        </Card>
        {message === undefined ? null : (
          <AppText
            accessibilityRole="alert"
            style={{ textAlign: 'center' }}
            tone="danger"
            variant="body"
          >
            {message}
          </AppText>
        )}
        <Button
          accessibilityLabel="생체인증 다시 시도"
          disabled={pending}
          onPress={() => void authenticate()}
          variant="brand"
        >
          {pending ? '확인 중' : '생체인증 다시 시도'}
        </Button>
      </View>
    </Screen>
  );
}
