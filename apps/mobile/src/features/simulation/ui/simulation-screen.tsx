import { useState } from 'react';
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

import { PlatformApiError } from '../../../shared/api';
import { formatWon } from '../../../shared/format/finance-format';
import { useSimulation } from '../hooks/use-simulation';
import {
  toSimulationInput,
  useSimulationDraftStore,
  validateSimulationDraft,
  type SimulationDraft,
} from '../model/simulation-draft-store';
import { PercentileChart } from './percentile-chart';

const fields: readonly {
  readonly field: keyof SimulationDraft;
  readonly label: string;
}[] = [
  { field: 'initialAssets', label: '시작 자산' },
  { field: 'monthlyContribution', label: '월 납입액' },
  { field: 'durationMonths', label: '기간(개월)' },
  { field: 'targetAmount', label: '목표 금액' },
];

export function SimulationScreen() {
  const draft = useSimulationDraftStore();
  const simulation = useSimulation();
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateSimulationDraft(draft) : {};
  const submit = () => {
    setSubmitted(true);
    const input = toSimulationInput(draft);
    if (input) simulation.create.mutate(input);
  };
  const result = simulation.result.data;
  const requestError = simulation.create.error ?? simulation.result.error;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DETERMINISTIC · SYNTHETIC V1</Text>
        <Text accessibilityRole="header" style={styles.title}>
          자산 시뮬레이션
        </Text>
        <Text style={styles.disclaimer}>
          합성 데이터 기반 기술 데모이며 실제 수익 예측이나 투자 조언이
          아닙니다.
        </Text>
        <View style={styles.card}>
          {fields.map(({ field, label }) => (
            <View key={field} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                accessibilityLabel={label}
                keyboardType="decimal-pad"
                onChangeText={(value) => draft.setField(field, value)}
                style={styles.input}
                value={draft[field]}
              />
              {errors[field] ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {errors[field]}
                </Text>
              ) : null}
            </View>
          ))}
          <Text style={styles.allocation}>
            고정 배분 · 현금 10% / 채권 30% / 주식 60%
          </Text>
          <Pressable
            accessibilityLabel="시뮬레이션 실행"
            accessibilityRole="button"
            disabled={simulation.create.isPending}
            onPress={submit}
            style={styles.action}
          >
            {simulation.create.isPending ? (
              <ActivityIndicator color="#07111f" />
            ) : (
              <Text style={styles.actionText}>시뮬레이션 실행</Text>
            )}
          </Pressable>
        </View>
        {requestError ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.resultTitle}>
              실행 결과를 확인하지 못했습니다
            </Text>
            <Text style={styles.error}>
              {requestError instanceof PlatformApiError && requestError.code
                ? `${requestError.code} · 입력값을 확인해 주세요.`
                : '네트워크 상태를 확인하고 다시 실행해 주세요.'}
            </Text>
          </View>
        ) : null}
        {simulation.result.isFetching ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#39e8b5" />
            <Text style={styles.muted}>저장된 시뮬레이션 결과 확인 중</Text>
          </View>
        ) : null}
        {result ? (
          <View style={styles.card}>
            <Text style={styles.resultTitle}>서버 저장 결과</Text>
            <Text style={styles.probability}>
              목표 달성 확률 {Math.round(result.goalProbability * 100)}%
            </Text>
            <Text style={styles.muted}>
              최종 중앙값 {formatWon(result.finalValue.p50)}
            </Text>
            <Text style={styles.version}>
              Engine {result.engineVersion} · Assumptions{' '}
              {result.assumptionSetVersion}
            </Text>
            <PercentileChart series={result.series} />
            <Text style={styles.disclaimer}>{result.disclaimer}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: '#39e8b5',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  actionText: { color: '#07111f', fontSize: 14, fontWeight: '800' },
  allocation: { color: '#9aabc0', fontSize: 12, marginTop: 12 },
  card: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  content: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 28 },
  disclaimer: { color: '#39e8b5', fontSize: 11, lineHeight: 17, marginTop: 12 },
  error: { color: '#f8b4b4', fontSize: 11, lineHeight: 17, marginTop: 5 },
  errorCard: {
    backgroundColor: '#301d25',
    borderRadius: 18,
    marginTop: 16,
    padding: 18,
  },
  eyebrow: { color: '#39e8b5', fontSize: 11, fontWeight: '800' },
  field: { marginTop: 12 },
  input: {
    backgroundColor: '#07111f',
    borderColor: '#33455f',
    borderRadius: 10,
    borderWidth: 1,
    color: '#f4f7fb',
    fontSize: 15,
    marginTop: 7,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  label: { color: '#cbd7e8', fontSize: 12, fontWeight: '700' },
  loading: { alignItems: 'center', gap: 8, marginTop: 18 },
  muted: { color: '#91a1b7', fontSize: 12, marginTop: 8 },
  probability: {
    color: '#f4f7fb',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 12,
  },
  resultTitle: { color: '#f4f7fb', fontSize: 17, fontWeight: '800' },
  safe: { backgroundColor: '#07111f', flex: 1 },
  title: { color: '#f4f7fb', fontSize: 30, fontWeight: '800', marginTop: 14 },
  version: { color: '#8d7cf6', fontSize: 11, marginTop: 9 },
});
