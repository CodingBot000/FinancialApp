import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  LoadingState,
  NoticeBanner,
  PageHeader,
  Screen,
  spacing,
} from '../../../shared/design-system';
import {
  type CoachViewModel,
  useCoachDiagnosis,
} from '../hooks/use-coach-diagnosis';

const COACH_DISCLOSURE =
  '표시된 성향과 배분은 합성 데이터를 활용한 포트폴리오 예시이며 실제 투자 권유나 적합성 판단이 아닙니다.';

function AllocationComparison({
  viewModel,
}: {
  readonly viewModel: CoachViewModel;
}) {
  return (
    <View
      accessibilityLabel={viewModel.allocationAccessibilityLabel}
      accessible
      style={styles.allocation}
    >
      <View style={styles.comparisonLabels}>
        <AppText tone="secondary" variant="caption">
          자산군
        </AppText>
        <AppText tone="secondary" variant="caption">
          현재 / 제안
        </AppText>
      </View>
      {viewModel.allocationRows.map((row) => (
        <View key={row.assetClass} style={styles.allocationRow}>
          <AppText variant="body">{row.label}</AppText>
          <AppText variant="bodyStrong">{row.value}</AppText>
        </View>
      ))}
    </View>
  );
}

export function CoachScreen({
  onOpenConsultation,
  onOpenPlan,
  onOpenRiskCheck,
}: {
  readonly onOpenConsultation: () => void;
  readonly onOpenPlan: () => void;
  readonly onOpenRiskCheck: () => void;
}) {
  const coach = useCoachDiagnosis();

  return (
    <Screen>
      <PageHeader
        subtitle="내 자산과 투자 성향을 함께 보고, 지금 점검할 한 가지를 알려드려요."
        title="WM 코치"
      />

      {coach.pending ? (
        <LoadingState label="자산과 투자 성향을 함께 확인하고 있어요." />
      ) : null}

      {!coach.pending && coach.error ? (
        <ErrorState
          action={
            <Button onPress={coach.retry} variant="secondary">
              다시 확인
            </Button>
          }
          description="자산 정보를 다시 확인해 주세요."
          title="코치 진단을 준비하지 못했습니다."
        />
      ) : null}

      {coach.viewModel ? (
        <>
          {coach.partialError ? (
            <NoticeBanner
              title="일부 정보를 새로 확인하지 못했습니다."
              variant="warning"
            />
          ) : null}
          {coach.refreshing ? (
            <AppText tone="secondary" variant="caption">
              최신 정보를 확인하고 있어요.
            </AppText>
          ) : null}

          <Card>
            <AppText variant="heading">내 투자 성향</AppText>
            <AppText tone="brand" variant="title2">
              {coach.viewModel.profileSummary}
            </AppText>
            <AppText tone="secondary" variant="body">
              {coach.viewModel.contributionDescription}
            </AppText>
            <Button onPress={onOpenRiskCheck} variant="secondary">
              투자 성향 다시 진단
            </Button>
          </Card>

          <Card variant="warm">
            <AppText tone="brand" variant="label">
              오늘의 코치 인사이트
            </AppText>
            <AppText
              accessibilityLabel={
                coach.viewModel.diagnosisHeadlineAccessibilityLabel
              }
              accessibilityRole="header"
              variant="title2"
            >
              {coach.viewModel.diagnosisHeadline}
            </AppText>
            <AppText tone="secondary" variant="body">
              {coach.viewModel.diagnosisDescription}
            </AppText>
            <AppText tone="secondary" variant="caption">
              최근 자산 업데이트 기준
            </AppText>
          </Card>

          <Card>
            <AppText variant="heading">현재와 코치 제안안</AppText>
            <AppText tone="secondary" variant="body">
              투자 성향에 맞춘 예시 배분을 현재 자산과 비교했어요.
            </AppText>
            <AllocationComparison viewModel={coach.viewModel} />
          </Card>

          <Card>
            <AppText variant="heading">다음 단계</AppText>
            <AppText tone="secondary" variant="body">
              제안 배분으로 목표 자산의 예상 범위를 확인하거나 코치 상담을
              요청할 수 있어요.
            </AppText>
            <Button onPress={onOpenPlan} variant="brand">
              제안안으로 목표 확인
            </Button>
            <Button onPress={onOpenConsultation} variant="secondary">
              코치 상담 요청
            </Button>
          </Card>

          <DemoDisclosure>{COACH_DISCLOSURE}</DemoDisclosure>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  allocation: { gap: spacing[3] },
  allocationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
