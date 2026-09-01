import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LoginResult } from '../model/oidc-login-service';

type LoginUiState = 'idle' | 'opening' | 'cancelled' | 'error';

export function OidcLoginScreen({
  login,
}: {
  readonly login: () => Promise<LoginResult>;
}) {
  const [state, setState] = useState<LoginUiState>('idle');

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.eyebrowRow}>
          <View style={styles.brandMark} />
          <Text style={styles.eyebrow}>WEALTH SANDBOX</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          안전한 자산관리{`\n`}샌드박스에 로그인
        </Text>
        <Text style={styles.description}>
          시스템 브라우저에서 OIDC 로그인을 완료하면 앱으로 안전하게 돌아옵니다.
        </Text>

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>
            AUTHORIZATION CODE + PKCE S256
          </Text>
          <Text style={styles.securityBody}>
            앱에는 client secret을 두지 않으며 access token은 메모리에만
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
          accessibilityLabel="OIDC 시스템 브라우저 로그인"
          accessibilityRole="button"
          disabled={state === 'opening'}
          onPress={() => void startLogin()}
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
            <Text style={styles.loginButtonText}>OIDC로 로그인</Text>
          )}
        </Pressable>

        <Text style={styles.syntheticNotice}>
          SYNTHETIC FINANCIAL DATA · 실제 금융서비스가 아닙니다
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
  const missingNames = missing.map((field) =>
    field === 'issuer'
      ? 'EXPO_PUBLIC_OIDC_ISSUER'
      : 'EXPO_PUBLIC_OIDC_CLIENT_ID',
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="OIDC 설정 필요" style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          OIDC 연결 설정이 필요합니다
        </Text>
        <Text style={styles.description}>
          승인된 Identity Provider의 public mobile client 설정이 들어오기 전에는
          로그인을 시작하지 않습니다.
        </Text>
        {missingNames.length > 0 ? (
          <View style={styles.configurationCard}>
            <Text style={styles.securityTitle}>MISSING PUBLIC CONFIG</Text>
            <Text selectable style={styles.configurationValue}>
              {missingNames.join('\n')}
            </Text>
          </View>
        ) : null}
        {invalid.includes('issuer') ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            issuer는 HTTPS여야 하며 HTTP는 local development에서만 허용됩니다.
          </Text>
        ) : null}
        <Text style={styles.syntheticNotice}>
          client secret은 모바일 앱 설정에 추가하지 마세요.
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
