import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppText,
  APP_BRAND,
  Button,
  Card,
  DemoDisclosure,
  Screen,
} from '../../../shared/design-system';
import type { LoginResult } from '../model/oidc-login-service';

type LoginUiState = 'idle' | 'opening' | 'cancelled' | 'error';

export function OidcLoginScreen({
  login,
  loginMode = 'oidc',
}: {
  readonly login: () => Promise<LoginResult>;
  readonly loginMode?: 'oidc' | 'test';
}) {
  const [state, setState] = useState<LoginUiState>('idle');
  const isTestLogin = loginMode === 'test';

  const startLogin = useCallback(async () => {
    if (state === 'opening') return;
    setState('opening');
    try {
      const result = await login();
      setState(result === 'cancelled' ? 'cancelled' : 'idle');
    } catch {
      setState('error');
    }
  }, [login, state]);

  const confirmTestLogin = useCallback(() => {
    Alert.alert('테스트 로그인', '예시 계정으로 로그인하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '진행', onPress: () => void startLogin() },
    ]);
  }, [startLogin]);

  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: 16 }}>
        <AppText tone="brand" variant="label">
          {APP_BRAND.displayName}
        </AppText>
        <AppText accessibilityRole="header" variant="display">
          안전한 자산관리를{`\n`}시작해 보세요.
        </AppText>
        <AppText tone="secondary" variant="body">
          {isTestLogin
            ? '예시 계정으로 앱의 주요 기능을 확인할 수 있습니다.'
            : '안전한 인증을 마치면 앱으로 돌아옵니다.'}
        </AppText>
        <Card variant="warm">
          <AppText variant="heading">안전한 로그인</AppText>
          <AppText tone="secondary" variant="body">
            로그인 정보는 안전하게 보호되며, 앱에는 비밀 설정을 저장하지
            않습니다.
          </AppText>
        </Card>
        {state === 'cancelled' ? (
          <AppText accessibilityRole="alert" tone="warning" variant="body">
            로그인이 취소되었습니다. 준비되면 다시 시도해 주세요.
          </AppText>
        ) : null}
        {state === 'error' ? (
          <AppText accessibilityRole="alert" tone="danger" variant="body">
            로그인 요청을 완료하지 못했습니다. 연결 상태와 인증 설정을 확인해
            주세요.
          </AppText>
        ) : null}
        <Button
          accessibilityLabel={
            isTestLogin ? '테스트 로그인' : '브라우저로 로그인'
          }
          disabled={state === 'opening'}
          onPress={isTestLogin ? confirmTestLogin : () => void startLogin()}
          variant="brand"
        >
          {state === 'opening'
            ? '브라우저 여는 중'
            : isTestLogin
              ? '테스트 로그인'
              : '브라우저로 로그인'}
        </Button>
        <DemoDisclosure />
      </View>
    </Screen>
  );
}

export function OidcConfigurationScreen({
  invalid,
  missing,
}: {
  readonly invalid: readonly ('clientId' | 'issuer')[];
  readonly missing: readonly ('clientId' | 'issuer')[];
}) {
  return (
    <Screen contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: 16 }}>
        <AppText accessibilityRole="header" variant="title1">
          로그인을 준비하고 있습니다.
        </AppText>
        <AppText tone="secondary" variant="body">
          안전한 로그인 연결이 준비되면 다시 시도해 주세요.
        </AppText>
        {missing.length > 0 ? (
          <Card variant="info">
            <AppText variant="heading">필요한 연결 정보</AppText>
            <AppText selectable tone="secondary" variant="body">
              {missing
                .map((field) =>
                  field === 'issuer' ? '인증 서버 주소' : '클라이언트 ID',
                )
                .join('\n')}
            </AppText>
          </Card>
        ) : null}
        {invalid.includes('issuer') ? (
          <AppText accessibilityRole="alert" tone="danger" variant="body">
            로그인 연결을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.
          </AppText>
        ) : null}
        <DemoDisclosure />
      </View>
    </Screen>
  );
}
