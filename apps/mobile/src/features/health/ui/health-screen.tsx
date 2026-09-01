import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PLATFORM_CONTRACT_VERSION } from '../../../shared/api';
import { usePlatformHealth } from '../hooks/use-platform-health';
import { ChartSmoke } from './chart-smoke';

export function HealthScreen() {
  const { retry, state } = usePlatformHealth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrowRow}>
          <View style={styles.brandMark} />
          <Text style={styles.eyebrow}>WEALTH SANDBOX</Text>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          자산의 흐름을{`\n`}안전하게 연결합니다.
        </Text>
        <Text style={styles.subtitle}>
          합성 금융 데이터로 검증하는 모바일 자산관리 플랫폼
        </Text>

        <View accessibilityLabel="플랫폼 연결 상태" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardLabel}>PLATFORM STATUS</Text>
            <View style={styles.contractBadge}>
              <Text style={styles.contractText}>
                {PLATFORM_CONTRACT_VERSION}
              </Text>
            </View>
          </View>

          {state.status === 'loading' ? (
            <View style={styles.stateRow}>
              <ActivityIndicator color="#39e8b5" />
              <Text style={styles.stateTitle}>연결을 확인하는 중</Text>
            </View>
          ) : null}

          {state.status === 'ready' ? (
            <View>
              <View style={styles.stateRow}>
                <View style={styles.readyDot} />
                <Text style={styles.stateTitle}>서비스 준비 완료</Text>
              </View>
              <Text style={styles.datasetLabel}>DATASET</Text>
              <Text selectable style={styles.datasetValue}>
                {state.health.datasetVersion}
              </Text>
            </View>
          ) : null}

          {state.status === 'error' ? (
            <View>
              <Text style={styles.errorTitle}>연결을 확인하지 못했습니다</Text>
              <Text style={styles.errorBody}>{state.message}</Text>
              {state.retryable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="플랫폼 연결 다시 확인"
                  onPress={retry}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.retryButtonPressed,
                  ]}
                >
                  <Text style={styles.retryText}>다시 확인</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardLabel}>CHART COMPATIBILITY</Text>
            <Text style={styles.chartStack}>Victory · Skia · Reanimated</Text>
          </View>
          <ChartSmoke />
        </View>

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>SYNTHETIC FINANCIAL DATA</Text>
          <Text style={styles.disclaimerBody}>
            이 앱의 사용자·기관·계좌·시세는 모두 재현 가능한 합성 데이터입니다.
            실제 금융서비스나 투자 조언이 아닙니다.
          </Text>
        </View>
      </ScrollView>
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
  cardLabel: {
    color: '#8191a7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  chartCard: {
    backgroundColor: '#0d1929',
    borderColor: '#1c2b40',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  chartStack: {
    color: '#718198',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 36,
    paddingHorizontal: 22,
    paddingTop: 34,
  },
  contractBadge: {
    backgroundColor: '#16253a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contractText: {
    color: '#91a1b7',
    fontSize: 11,
    fontWeight: '600',
  },
  datasetLabel: {
    color: '#66778d',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 22,
  },
  datasetValue: {
    color: '#cad5e3',
    fontSize: 13,
    marginTop: 7,
  },
  disclaimerBody: {
    color: '#91a1b7',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  disclaimerCard: {
    borderColor: '#1c2b40',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  disclaimerTitle: {
    color: '#39e8b5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  errorBody: {
    color: '#aebbd0',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  errorTitle: {
    color: '#f8b4b4',
    fontSize: 18,
    fontWeight: '700',
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
  readyDot: {
    backgroundColor: '#39e8b5',
    borderRadius: 999,
    height: 10,
    shadowColor: '#39e8b5',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 10,
  },
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
  retryButtonPressed: {
    opacity: 0.75,
  },
  retryText: {
    color: '#07111f',
    fontSize: 14,
    fontWeight: '800',
  },
  safeArea: {
    backgroundColor: '#07111f',
    flex: 1,
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  stateTitle: {
    color: '#f4f7fb',
    fontSize: 19,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 40,
    minHeight: 188,
    padding: 22,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitle: {
    color: '#91a1b7',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 18,
    maxWidth: 320,
  },
  title: {
    color: '#f5f8fc',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 48,
    marginTop: 34,
  },
});
