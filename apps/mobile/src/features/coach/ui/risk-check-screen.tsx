import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usePlatformApi } from '../../../shared/api';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  FullScreenPage,
  LoadingState,
  NoticeBanner,
  SegmentedControl,
} from '../../../shared/design-system';
import {
  RISK_QUESTIONS,
  calculateRiskQuestionnaire,
  type RiskAnswers,
  type RiskQuestionId,
  type RiskAnswerValue,
} from '../model/risk-questionnaire';

const RISK_CHECK_DISCLOSURE =
  '간이 진단 결과는 포트폴리오 시연을 위한 예시이며 실제 투자 적합성 판단이 아닙니다.';

export function RiskCheckScreen({
  backIcon,
  onBack,
  onComplete,
}: {
  readonly backIcon: ReactNode;
  readonly onBack: () => void;
  readonly onComplete: () => void;
}) {
  const api = usePlatformApi();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<RiskAnswers>({});
  const [resultVisible, setResultVisible] = useState(false);
  const profile = useQuery({
    queryFn: ({ signal }) => api.getRiskProfile({ signal }),
    queryKey: ['risk-profile'],
  });
  const result = useMemo(() => calculateRiskQuestionnaire(answers), [answers]);
  const save = useMutation({
    mutationFn: () => {
      if (profile.data === undefined || result === undefined) {
        throw new Error('Risk profile and questionnaire result are required.');
      }
      return api.updateRiskProfile({
        expectedVersion: profile.data.version,
        investmentHorizonMonths: result.investmentHorizonMonths,
        monthlyContribution: profile.data.monthlyContribution,
        riskLevel: result.riskLevel,
      });
    },
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(['risk-profile'], updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      onComplete();
    },
    retry: false,
  });

  const selectAnswer = (questionId: RiskQuestionId, value: RiskAnswerValue) => {
    if (save.isPending) return;
    save.reset();
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  return (
    <FullScreenPage
      backIcon={backIcon}
      onBack={onBack}
      title="투자 성향 간이 진단"
    >
      <AppText tone="secondary" variant="body">
        세 가지 질문으로 포트폴리오용 투자 성향을 확인해 보세요.
      </AppText>

      {profile.isPending ? (
        <LoadingState label="현재 투자 성향을 확인하고 있어요." />
      ) : null}

      {profile.isError ? (
        <ErrorState
          action={
            <Button onPress={() => void profile.refetch()} variant="secondary">
              다시 확인
            </Button>
          }
          title="투자 성향을 확인하지 못했습니다."
        />
      ) : null}

      {profile.data && !profile.isError ? (
        <>
          {RISK_QUESTIONS.map((question) => (
            <Card key={question.id}>
              <AppText variant="heading">{question.title}</AppText>
              <SegmentedControl
                onChange={(value) => selectAnswer(question.id, value)}
                options={question.options}
                value={answers[question.id] ?? ('' as RiskAnswerValue)}
              />
            </Card>
          ))}

          {!resultVisible ? (
            <Button
              disabled={result === undefined}
              onPress={() => setResultVisible(true)}
              variant="brand"
            >
              진단 결과 확인
            </Button>
          ) : null}

          {resultVisible && result ? (
            <Card variant="warm">
              <AppText tone="brand" variant="label">
                진단 결과
              </AppText>
              <AppText accessibilityRole="header" variant="title2">
                {result.label}
              </AppText>
              <AppText tone="secondary" variant="body">
                {result.description}
              </AppText>
              {save.isError ? (
                <NoticeBanner
                  title="진단 결과를 저장하지 못했습니다."
                  variant="danger"
                >
                  잠시 후 다시 시도해 주세요.
                </NoticeBanner>
              ) : null}
              <Button
                accessibilityLabel="이 성향으로 코칭 받기"
                loading={save.isPending}
                onPress={() => save.mutate()}
                variant="brand"
              >
                이 성향으로 코칭 받기
              </Button>
            </Card>
          ) : null}

          <DemoDisclosure>{RISK_CHECK_DISCLOSURE}</DemoDisclosure>
        </>
      ) : null}
    </FullScreenPage>
  );
}
