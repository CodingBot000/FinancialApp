import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    if (state === 'opening') {
      return;
    }

    setState('opening');
    try {
      const result = await login();
      setState(result === 'cancelled' ? 'cancelled' : 'idle');
    } catch {
      setState('error');
    }
  }, [login, state]);

  const confirmTestLogin = useCallback(() => {
    Alert.alert(
      '테스트 로그인',
      '로컬 개발용 가상 계정으로 로그인하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '진행', onPress: () => void startLogin() },
      ],
    );
  }, [startLogin]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.eyebrowRow}>
          <View style={styles.brandMark} />
          <Text style={styles.eyebrow}>자산 샌드박스</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          안전한 자산관리{`\n`}샌드박스에 로그인
        </Text>
        <Text style={styles.description}>
          {isTestLogin
            ? '로컬 개발 환경에서는 가상 계정으로 앱 흐름을 확인할 수 있습니다.'
            : '시스템 브라우저에서 인증을 완료하면 앱으로 안전하게 돌아옵니다.'}
        </Text>

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>보안 인증 · PKCE 방식</Text>
          <Text style={styles.securityBody}>
            앱에는 클라이언트 비밀값을 두지 않으며 접근 토큰은 메모리에만
            보관합니다.
          </Text>
        </View>

        {state === 'cancelled' ? (
          <Text accessibilityRole="alert" style={styles.noticeText}>
            로그인이 취소되었습니다. 준비되면 다시 시도해 주세요.
          </Text>
        ) : null}
        {state === 'error' ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            로그인 요청을 완료하지 못했습니다. 연결 상태와 인증 설정을 확인해
            주세요.
          </Text>
        ) : null}

        <Pressable
          accessibilityLabel={
            isTestLogin ? '테스트 로그인' : '브라우저로 로그인'
          }
          accessibilityRole="button"
          disabled={state === 'opening'}
          onPress={isTestLogin ? confirmTestLogin : () => void startLogin()}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
          ]}
        >
          {state === 'opening' ? (
            <View style={styles.buttonProgress}>
              <ActivityIndicator color="#07111f" />
              <Text style={styles.loginButtonText}>브라우저 여는 중</Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>
              {isTestLogin ? '테스트 로그인' : '브라우저로 로그인'}
            </Text>
          )}
        </Pressable>

        <Text style={styles.syntheticNotice}>
          테스트 금융 데이터 · 실제 금융서비스가 아닙니다
        </Text>
      </View>
    </SafeAreaView>
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
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="인증 설정 필요" style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          인증 연결 설정이 필요합니다
        </Text>
        <Text style={styles.description}>
          승인된 인증 제공자의 모바일 공개 설정이 들어오기 전에는 로그인을
          시작하지 않습니다.
        </Text>
        {missing.length > 0 ? (
          <View style={styles.configurationCard}>
            <Text style={styles.securityTitle}>필수 공개 설정</Text>
            <Text selectable style={styles.configurationValue}>
              {missing
                .map((field) =>
                  field === 'issuer' ? '인증 서버 주소' : '클라이언트 ID',
                )
                .join('\n')}
            </Text>
          </View>
        ) : null}
        {invalid.includes('issuer') ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            인증 서버 주소는 HTTPS여야 하며 HTTP는 로컬 개발에서만 허용됩니다.
          </Text>
        ) : null}
        <Text style={styles.syntheticNotice}>
          클라이언트 비밀값은 모바일 앱 설정에 추가하지 마세요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    backgroundColor: '#39e8b5',
    borderRadius: 3,
    height: 12,
    transform: [{ rotate: '45deg' }],
    width: 12,
  },
  buttonProgress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  configurationCard: {
    backgroundColor: '#0d1929',
    borderColor: '#22334a',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 28,
    padding: 20,
    width: '100%',
  },
  configurationValue: {
    color: '#cad5e3',
    fontSize: 13,
    lineHeight: 22,
    marginTop: 12,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  description: {
    color: '#aebbd0',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
    maxWidth: 400,
    textAlign: 'center',
  },
  errorText: {
    color: '#f8b4b4',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 20,
    textAlign: 'center',
  },
  eyebrow: {
    color: '#b8c7db',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#39e8b5',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 30,
    minHeight: 54,
    paddingHorizontal: 28,
    width: '100%',
  },
  loginButtonPressed: {
    opacity: 0.75,
  },
  loginButtonText: {
    color: '#07111f',
    fontSize: 15,
    fontWeight: '800',
  },
  noticeText: {
    color: '#f5d58a',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: '#07111f',
    flex: 1,
  },
  securityBody: {
    color: '#91a1b7',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  securityCard: {
    backgroundColor: '#0d1929',
    borderColor: '#1c2b40',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 30,
    padding: 20,
    width: '100%',
  },
  securityTitle: {
    color: '#39e8b5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  syntheticNotice: {
    color: '#66778d',
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 28,
    textAlign: 'center',
  },
  title: {
    color: '#f4f7fb',
    fontSize: 29,
    fontWeight: '800',
    lineHeight: 38,
    marginTop: 28,
    textAlign: 'center',
  },
});
