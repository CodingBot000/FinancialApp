import { useState } from 'react';
import { View } from 'react-native';

import { PlatformApiError } from '../../../shared/api';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  LoadingState,
  MoneyValue,
  Screen,
  TextField,
} from '../../../shared/design-system';
import {
  displayLabel,
  displaySimulationDisclaimer,
} from '../../../shared/format/display-labels';
import { useMoneyVisibilityStore } from '../../../shared/privacy';
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
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
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
    <Screen>
      <AppText tone="brand" variant="label">
        플랜
      </AppText>
      <AppText accessibilityRole="header" variant="title1">
        목표 자산 미리보기
      </AppText>
      <AppText style={{ marginTop: 8 }} tone="secondary" variant="body">
        지금의 계획으로 앞으로의 자산 흐름을 살펴보세요.
      </AppText>
      <Card>
        {fields.map(({ field, label }) => (
          <View key={field} style={{ marginTop: 12 }}>
            <TextField
              {...(errors[field] ? { errorText: errors[field] } : {})}
              keyboardType="decimal-pad"
              label={label}
              onChangeText={(value) => draft.setField(field, value)}
              secureTextEntry={amountsHidden && field !== 'durationMonths'}
              value={draft[field]}
            />
          </View>
        ))}
        <AppText style={{ marginTop: 12 }} tone="secondary" variant="caption">
          기본 배분 · 현금 10% · 채권 30% · 주식 60%
        </AppText>
        <Button
          loading={simulation.create.isPending}
          onPress={submit}
          variant="brand"
        >
          미리보기 만들기
        </Button>
      </Card>

      {requestError ? (
        <ErrorState
          description={
            requestError instanceof PlatformApiError && requestError.code
              ? `${displayLabel(requestError.code)} · 입력값을 확인해 주세요.`
              : '연결 상태를 확인하고 다시 시도해 주세요.'
          }
          title="미리보기를 만들지 못했습니다."
        />
      ) : null}
      {simulation.result.isFetching ? (
        <LoadingState label="저장된 미리보기를 확인하고 있습니다." />
      ) : null}
      {result ? (
        <Card variant="warm">
          <AppText variant="heading">예상 결과</AppText>
          <AppText style={{ marginTop: 8 }} tone="brand" variant="title2">
            목표 달성 가능성 {Math.round(result.goalProbability * 100)}%
          </AppText>
          <AppText tone="secondary" variant="body">
            예상 중앙값{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={result.finalValue.p50}
            />
          </AppText>
          <PercentileChart series={result.series} />
          <AppText tone="secondary" variant="legal">
            {displaySimulationDisclaimer(result.disclaimer)}
          </AppText>
        </Card>
      ) : null}
      <DemoDisclosure />
    </Screen>
  );
}
