import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PlatformApiError,
  type DeveloperScenarioMode,
  type RiskProfile,
  usePlatformApi,
} from '../../../shared/api';
import { useAuthSession } from '../../../shared/auth/auth-session-context';
import { isDeveloperToolsEnabled } from '../../../shared/config';
import { useMoneyVisibilityStore } from '../../../shared/privacy';

const SCENARIOS: readonly DeveloperScenarioMode[] = [
  'NORMAL',
  'TIMEOUT',
  'HTTP_500',
  'MALFORMED_RESPONSE',
  'ORDER_REJECT',
  'ORDER_UNKNOWN_THEN_FILLED',
];

const RISK_LEVELS: readonly Readonly<{
  label: string;
  value: RiskProfile;
}>[] = [
  { label: '안정형', value: 'CONSERVATIVE' },
  { label: '균형형', value: 'BALANCED' },
  { label: '성장형', value: 'GROWTH' },
];

function problemMessage(error: unknown) {
  return error instanceof PlatformApiError
    ? error.message
    : '요청을 완료하지 못했습니다.';
}

export function SettingsScreen({
  developerToolsEnabled = isDeveloperToolsEnabled(),
}: {
  readonly developerToolsEnabled?: boolean;
}) {
  const api = usePlatformApi();
  const auth = useAuthSession();
  const queryClient = useQueryClient();
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const toggleAmounts = useMoneyVisibilityStore((state) => state.toggle);
  const [message, setMessage] = useState<string>();
  const [riskLevel, setRiskLevel] = useState<RiskProfile>('BALANCED');
  const [horizon, setHorizon] = useState('120');
  const [contribution, setContribution] = useState('1500000.0000');
  const user = useQuery({
    queryFn: ({ signal }) => api.getCurrentUser({ signal }),
    queryKey: ['current-user'],
  });
  const riskProfile = useQuery({
    queryFn: ({ signal }) => api.getRiskProfile({ signal }),
    queryKey: ['risk-profile'],
  });
  useEffect(() => {
    if (riskProfile.data === undefined) return;
    setRiskLevel(riskProfile.data.riskLevel);
    setHorizon(String(riskProfile.data.investmentHorizonMonths));
    setContribution(riskProfile.data.monthlyContribution);
  }, [riskProfile.data]);
  const updateRiskProfile = useMutation({
    mutationFn: () => {
      const months = Number(horizon);
      if (
        !/^\d+$/.test(horizon) ||
        !Number.isInteger(months) ||
        months < 1 ||
        months > 600 ||
        !/^\d+(?:\.\d{1,4})?$/.test(contribution) ||
        Number(contribution) > 10_000_000_000 ||
        riskProfile.data === undefined
      ) {
        throw new PlatformApiError({
          code: 'VALIDATION_FAILED',
          kind: 'contract',
          message: '기간과 월 납입액을 확인해 주세요.',
          retryable: false,
        });
      }
      return api.updateRiskProfile({
        riskLevel,
        investmentHorizonMonths: months,
        monthlyContribution: contribution,
        expectedVersion: riskProfile.data.version,
      });
    },
    onError: (error) => setMessage(problemMessage(error)),
    onSuccess: async (profile) => {
      queryClient.setQueryData(['risk-profile'], profile);
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setMessage('투자 성향 정보가 저장되었습니다.');
    },
    retry: false,
  });
  const scenario = useMutation({
    mutationFn: (mode: DeveloperScenarioMode) => api.setDeveloperScenario(mode),
    onError: (error) => setMessage(problemMessage(error)),
    onSuccess: ({ mode }) => setMessage(`시나리오 ${mode} 적용`),
    retry: false,
  });
  const reset = useMutation({
    mutationFn: () => api.resetDeveloperDataset(),
    onError: (error) => setMessage(problemMessage(error)),
    onSuccess: async ({ datasetVersion }) => {
      setMessage(`합성 데이터 ${datasetVersion} 초기화`);
      await queryClient.invalidateQueries();
    },
    retry: false,
  });
  const logout = async () => {
    await auth.clear();
    queryClient.clear();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PRIVACY · SYNTHETIC ONLY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          설정
        </Text>
        <View style={styles.card}>
          <Text style={styles.heading}>데이터 정보</Text>
          {user.isPending ? <ActivityIndicator color="#39e8b5" /> : null}
          {user.isError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              데이터셋 정보를 확인하지 못했습니다.
            </Text>
          ) : null}
          {user.data ? (
            <>
              <Text style={styles.value}>{user.data.displayName}</Text>
              <Text style={styles.muted}>
                데이터셋 {user.data.datasetVersion}
              </Text>
              <Text style={styles.synthetic}>
                합성 데이터 · 실제 개인정보·계좌정보 없음
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>투자 성향 정보</Text>
          <Text style={styles.muted}>
            합성 시뮬레이션의 기본 입력을 위한 선호 정보이며 투자 추천이
            아닙니다.
          </Text>
          {riskProfile.isPending ? <ActivityIndicator color="#39e8b5" /> : null}
          {riskProfile.isError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              투자 성향 정보를 확인하지 못했습니다.
            </Text>
          ) : null}
          {riskProfile.data ? (
            <>
              <View style={styles.riskRow}>
                {RISK_LEVELS.map(({ label, value }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: riskLevel === value }}
                    key={value}
                    onPress={() => setRiskLevel(value)}
                    style={[
                      styles.riskButton,
                      riskLevel === value && styles.riskButtonSelected,
                    ]}
                  >
                    <Text style={styles.riskText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="투자 기간 개월"
                keyboardType="number-pad"
                onChangeText={setHorizon}
                style={styles.input}
                value={horizon}
              />
              <TextInput
                accessibilityLabel="월 납입액"
                keyboardType="decimal-pad"
                onChangeText={setContribution}
                style={styles.input}
                value={contribution}
              />
              <Pressable
                accessibilityRole="button"
                disabled={updateRiskProfile.isPending}
                onPress={() => updateRiskProfile.mutate()}
                style={styles.saveButton}
              >
                <Text style={styles.saveText}>투자 성향 저장</Text>
              </Pressable>
            </>
          ) : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>개인정보 보호</Text>
          <Pressable
            accessibilityLabel="금액 숨기기"
            accessibilityRole="switch"
            accessibilityState={{ checked: amountsHidden }}
            onPress={toggleAmounts}
            style={styles.rowButton}
          >
            <Text style={styles.value}>금액 숨기기</Text>
            <Text style={styles.state}>{amountsHidden ? '켜짐' : '꺼짐'}</Text>
          </Pressable>
          <Text style={styles.muted}>
            자산·시뮬레이션·주문 화면과 접근성 라벨의 금액을 함께 가립니다.
          </Text>
        </View>
        {developerToolsEnabled ? (
          <View style={styles.card}>
            <Text style={styles.heading}>개발자 도구</Text>
            <Text style={styles.muted}>
              local/demo 합성 시뮬레이터에만 적용됩니다.
            </Text>
            {SCENARIOS.map((mode) => (
              <Pressable
                accessibilityRole="button"
                disabled={scenario.isPending || reset.isPending}
                key={mode}
                onPress={() => scenario.mutate(mode)}
                style={styles.scenarioButton}
              >
                <Text style={styles.scenarioText}>시나리오 {mode}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={scenario.isPending || reset.isPending}
              onPress={() => reset.mutate()}
              style={styles.resetButton}
            >
              <Text style={styles.resetText}>합성 데이터셋 초기화</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? (
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {message}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => void logout()}
          style={styles.logout}
        >
          <Text style={styles.logoutText}>로컬 세션 로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  content: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 28 },
  error: { color: '#f8b4b4', fontSize: 12, marginTop: 10 },
  eyebrow: { color: '#39e8b5', fontSize: 11, fontWeight: '800' },
  heading: { color: '#f4f7fb', fontSize: 17, fontWeight: '800' },
  input: {
    borderColor: '#30435d',
    borderRadius: 10,
    borderWidth: 1,
    color: '#dce5f0',
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  logout: {
    alignItems: 'center',
    borderColor: '#f08d8d',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  logoutText: { color: '#f8b4b4', fontWeight: '800' },
  muted: { color: '#91a1b7', fontSize: 11, lineHeight: 18, marginTop: 8 },
  resetButton: {
    alignItems: 'center',
    borderColor: '#f6c76a',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  resetText: { color: '#f6c76a', fontSize: 12, fontWeight: '800' },
  rowButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  riskButton: {
    alignItems: 'center',
    borderColor: '#30435d',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  riskButtonSelected: { borderColor: '#39e8b5' },
  riskRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  riskText: { color: '#dce5f0', fontSize: 12, fontWeight: '700' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#163c34',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  saveText: { color: '#76f3ce', fontSize: 13, fontWeight: '800' },
  safe: { backgroundColor: '#07111f', flex: 1 },
  scenarioButton: {
    borderBottomColor: '#22334a',
    borderBottomWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  scenarioText: { color: '#d9e3ef', fontSize: 12, fontWeight: '700' },
  state: { color: '#39e8b5', fontSize: 12, fontWeight: '800' },
  status: { color: '#39e8b5', fontSize: 12, marginTop: 12 },
  synthetic: { color: '#39e8b5', fontSize: 11, lineHeight: 18, marginTop: 8 },
  title: { color: '#f4f7fb', fontSize: 30, fontWeight: '800', marginTop: 14 },
  value: { color: '#dce5f0', fontSize: 14, fontWeight: '700', marginTop: 8 },
});
