import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '../../../shared/auth/auth-session-context';
import { displayDatasetVersion } from '../../../shared/format/display-labels';
import { useCurrentUser } from '../hooks/use-current-user';

const RISK_LABEL = {
  BALANCED: '균형형',
  CONSERVATIVE: '안정형',
  GROWTH: '성장형',
} as const;

export function CurrentUserScreen() {
  const manager = useAuthSession();
  const { retry, state } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await manager.clear();
    } finally {
      setLoggingOut(false);
    }
  }, [manager]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>자산 샌드박스 · 인증</Text>
        <Text accessibilityRole="header" style={styles.title}>
          인증된 사용자 연결
        </Text>
        <Text style={styles.description}>
          메모리 접근 토큰과 갱신 가능한 보안 세션으로 현재 사용자를 확인합니다.
        </Text>

        <View accessibilityLabel="현재 사용자" style={styles.card}>
          {state.status === 'loading' ? (
            <View style={styles.stateRow}>
              <ActivityIndicator color="#39e8b5" />
              <Text style={styles.stateTitle}>사용자 정보를 확인하는 중</Text>
            </View>
          ) : null}

          {state.status === 'ready' ? (
            <View>
              <Text style={styles.cardLabel}>현재 사용자</Text>
              <Text style={styles.userName}>{state.user.displayName}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>투자 성향</Text>
                <Text style={styles.detailValue}>
                  {RISK_LABEL[state.user.riskProfile]}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>데이터셋</Text>
                <Text selectable style={styles.detailValue}>
                  {displayDatasetVersion(state.user.datasetVersion)}
                </Text>
              </View>
            </View>
          ) : null}

          {state.status === 'error' ? (
            <View>
              <Text accessibilityRole="alert" style={styles.errorTitle}>
                사용자 연결을 확인하지 못했습니다
              </Text>
              <Text style={styles.errorBody}>{state.message}</Text>
              {state.retryable ? (
                <Pressable
                  accessibilityLabel="현재 사용자 다시 확인"
                  accessibilityRole="button"
                  onPress={retry}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>다시 확인</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>테스트 데이터만 사용</Text>
          <Text style={styles.noticeBody}>
            이 사용자와 모든 금융 데이터는 로컬 테스트용입니다. 실제
            금융서비스나 투자 조언이 아닙니다.
          </Text>
        </View>

        <Pressable
          accessibilityLabel="로컬 세션 로그아웃"
          accessibilityRole="button"
          disabled={loggingOut}
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          {loggingOut ? (
            <ActivityIndicator color="#cad5e3" />
          ) : (
            <Text style={styles.logoutText}>로그아웃</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 36,
    minHeight: 220,
    padding: 22,
  },
  cardLabel: {
    color: '#8191a7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 36,
    paddingHorizontal: 22,
    paddingTop: 46,
  },
  description: {
    color: '#aebbd0',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
  },
  detailLabel: { color: '#718198', fontSize: 13 },
  detailRow: {
    alignItems: 'center',
    borderTopColor: '#1c2b40',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
  },
  detailValue: {
    color: '#cad5e3',
    flexShrink: 1,
    fontSize: 13,
    marginLeft: 16,
    textAlign: 'right',
  },
  errorBody: { color: '#aebbd0', fontSize: 14, lineHeight: 21, marginTop: 9 },
  errorTitle: { color: '#f8b4b4', fontSize: 18, fontWeight: '700' },
  eyebrow: {
    color: '#39e8b5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: '#30435d',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 52,
  },
  logoutText: { color: '#cad5e3', fontSize: 15, fontWeight: '700' },
  noticeBody: { color: '#91a1b7', fontSize: 14, lineHeight: 21, marginTop: 8 },
  noticeCard: {
    borderColor: '#1c2b40',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  noticeTitle: {
    color: '#39e8b5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  pressed: { opacity: 0.7 },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#39e8b5',
    borderRadius: 12,
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: { color: '#07111f', fontSize: 14, fontWeight: '800' },
  safeArea: { backgroundColor: '#07111f', flex: 1 },
  stateRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  stateTitle: { color: '#f4f7fb', fontSize: 17, fontWeight: '700' },
  title: {
    color: '#f4f7fb',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 39,
    marginTop: 18,
  },
  userName: {
    color: '#f4f7fb',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 22,
  },
});
