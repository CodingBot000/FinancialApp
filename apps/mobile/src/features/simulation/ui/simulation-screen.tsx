import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { PlatformApiError, usePlatformApi } from '../../../shared/api';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  FullScreenPage,
  LoadingState,
  MoneyValue,
  NoticeBanner,
  TextField,
  spacing,
} from '../../../shared/design-system';
import {
  displayLabel,
  displaySimulationDisclaimer,
} from '../../../shared/format/display-labels';
import { useMoneyVisibilityStore } from '../../../shared/privacy';
import {
  DEFAULT_PLANNING_RISK_PROFILE,
  RISK_PROFILE_LABELS,
  allocationForRiskProfile,
  formatAllocationSummary,
} from '../../../shared/planning';
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

const SIMULATION_DISCLOSURE =
  '합성 데이터를 사용한 예상 결과이며 실제 수익이나 투자 성과를 보장하지 않습니다.';

export function SimulationScreen({
  backIcon,
  onBack,
}: {
  readonly backIcon: ReactNode;
  readonly onBack: () => void;
}) {
  const api = usePlatformApi();
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const draft = useSimulationDraftStore();
  const simulation = useSimulation();
  const [submitted, setSubmitted] = useState(false);
  const riskProfile = useQuery({
    queryFn: ({ signal }) => api.getRiskProfile({ signal }),
    queryKey: ['risk-profile'],
  });
  const effectiveRiskProfile = riskProfile.isError
    ? DEFAULT_PLANNING_RISK_PROFILE
    : (riskProfile.data?.riskLevel ?? DEFAULT_PLANNING_RISK_PROFILE);
  const allocation = allocationForRiskProfile(effectiveRiskProfile);
  const allocationSummary = formatAllocationSummary(allocation);
  const fallbackProfileLabel =
    RISK_PROFILE_LABELS[DEFAULT_PLANNING_RISK_PROFILE];
  const fallbackDescription = `${fallbackProfileLabel} 예시 배분으로 목표 결과를 확인합니다.`;
  const errors = submitted ? validateSimulationDraft(draft) : {};
  const submit = () => {
    setSubmitted(true);
    const input = toSimulationInput(draft, allocation);
    if (input) simulation.create.mutate(input);
  };
  const result = simulation.result.data;
  const requestError = simulation.create.error ?? simulation.result.error;

  return (
    <FullScreenPage
      backIcon={backIcon}
      onBack={onBack}
      title="목표 자산 미리보기"
    >
      <AppText tone="secondary" variant="body">
        코치 제안 배분으로 앞으로의 자산 흐름을 살펴보세요.
      </AppText>

      {riskProfile.isPending ? (
        <LoadingState label="투자 성향을 확인하고 있어요." />
      ) : null}

      {riskProfile.isError ? (
        <NoticeBanner
          title="투자 성향을 확인하지 못했습니다."
          variant="warning"
        >
          {fallbackDescription}
        </NoticeBanner>
      ) : null}

      {!riskProfile.isPending ? (
        <Card>
          {fields.map(({ field, label }) => (
            <View key={field}>
              <TextField
                {...(errors[field] ? { errorText: errors[field] } : {})}
                keyboardType="number-pad"
                label={label}
                onChangeText={(value) => draft.setField(field, value)}
                secureTextEntry={amountsHidden && field !== 'durationMonths'}
                value={draft[field]}
              />
            </View>
          ))}
          <View style={styles.allocation}>
            <AppText variant="label">코치 제안 배분</AppText>
            <AppText tone="secondary" variant="caption">
              {allocationSummary}
            </AppText>
          </View>
          <Button
            loading={simulation.create.isPending}
            onPress={submit}
            variant="brand"
          >
            목표 결과 확인
          </Button>
        </Card>
      ) : null}

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
          <AppText tone="brand" variant="title2">
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
      <DemoDisclosure>{SIMULATION_DISCLOSURE}</DemoDisclosure>
    </FullScreenPage>
  );
}

const styles = StyleSheet.create({
  allocation: { gap: spacing[1] },
});
