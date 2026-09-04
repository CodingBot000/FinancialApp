import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  PlatformApiError,
  type RiskProfile,
  usePlatformApi,
} from '../../../shared/api';
import { useAuthSession } from '../../../shared/auth/auth-session-context';
import { useOptionalPortfolioAccess } from '../../../shared/auth/portfolio-access-context';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  FullScreenPage,
  LoadingState,
  NoticeBanner,
  PageHeader,
  Screen,
  TextField,
  colors,
  radius,
  spacing,
} from '../../../shared/design-system';
import { formatWonInput } from '../../../shared/format/finance-format';
import { useMoneyVisibilityStore } from '../../../shared/privacy';

const RISK_LEVELS: readonly Readonly<{ label: string; value: RiskProfile }>[] =
  [
    { label: '안정형', value: 'CONSERVATIVE' },
    { label: '균형형', value: 'BALANCED' },
    { label: '성장형', value: 'GROWTH' },
  ];

function problemMessage(error: unknown) {
  return error instanceof PlatformApiError
    ? error.message
    : '요청을 완료하지 못했습니다.';
}

type SettingsScreenProps =
  | { readonly onBack?: never; readonly backIcon?: never }
  | { readonly backIcon: ReactNode; readonly onBack: () => void };

export function SettingsScreen({ backIcon, onBack }: SettingsScreenProps = {}) {
  const api = usePlatformApi();
  const auth = useAuthSession();
  const portfolioAccess = useOptionalPortfolioAccess();
  const queryClient = useQueryClient();
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const toggleAmounts = useMoneyVisibilityStore((state) => state.toggle);
  const [message, setMessage] = useState<string>();
  const [riskLevel, setRiskLevel] = useState<RiskProfile>('BALANCED');
  const [horizon, setHorizon] = useState('120');
  const [contribution, setContribution] = useState('1500000');
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
    setContribution(formatWonInput(riskProfile.data.monthlyContribution));
  }, [riskProfile.data]);

  const updateRiskProfile = useMutation({
    mutationFn: () => {
      const months = Number(horizon);
      if (
        !/^\d+$/.test(horizon) ||
        !Number.isInteger(months) ||
        months < 1 ||
        months > 600 ||
        !/^\d+$/.test(contribution) ||
        Number(contribution) > 10_000_000_000 ||
        riskProfile.data === undefined
      ) {
        throw new PlatformApiError({
          code: 'VALIDATION_FAILED',
          kind: 'contract',
          message: '기간과 월 납입액을 원 단위로 확인해 주세요.',
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

  const logout = async () => {
    await auth.clear();
    queryClient.clear();
    portfolioAccess?.lock();
  };

  const resetPortfolio = async () => {
    try {
      await auth.clear();
      queryClient.clear();
      await portfolioAccess?.reset();
    } catch {
      setMessage('포트폴리오 초기화에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const content = (
    <>
      {onBack ? (
        <AppText style={styles.fullScreenSubtitle} tone="secondary">
          보안, 개인정보 보호와 투자 성향을 관리하세요.
        </AppText>
      ) : (
        <PageHeader
          subtitle="보안, 개인정보 보호와 투자 성향을 관리하세요."
          title="내 정보"
        />
      )}
      <Card>
        <AppText variant="heading">내 계정</AppText>
        {user.isPending ? (
          <LoadingState label="내 정보를 확인하고 있습니다." />
        ) : null}
        {user.isError ? (
          <ErrorState title="내 정보를 확인하지 못했습니다." />
        ) : null}
        {user.data ? (
          <>
            <AppText style={styles.name} variant="title2">
              {user.data.displayName}
            </AppText>
            <AppText tone="secondary" variant="caption">
              내 자산 정보는 안전하게 보호됩니다.
            </AppText>
          </>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">투자 성향 정보</AppText>
        <AppText tone="secondary" variant="body">
          미리보기 계산에 활용되는 선호 정보이며 투자 추천이 아닙니다.
        </AppText>
        {riskProfile.isPending ? (
          <LoadingState label="투자 성향을 확인하고 있습니다." />
        ) : null}
        {riskProfile.isError ? (
          <ErrorState title="투자 성향을 확인하지 못했습니다." />
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
                  <AppText variant="label">{label}</AppText>
                </Pressable>
              ))}
            </View>
            <TextField
              accessibilityLabel="투자 기간 개월"
              keyboardType="number-pad"
              label="투자 기간(개월)"
              onChangeText={setHorizon}
              value={horizon}
            />
            <TextField
              accessibilityLabel="월 납입액"
              keyboardType="number-pad"
              label="월 납입액"
              onChangeText={setContribution}
              value={contribution}
            />
            <Button
              loading={updateRiskProfile.isPending}
              onPress={() => updateRiskProfile.mutate()}
              variant="brand"
            >
              투자 성향 저장
            </Button>
          </>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">개인정보 보호</AppText>
        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <AppText variant="bodyStrong">금액 숨기기</AppText>
            <AppText tone="secondary" variant="caption">
              홈, 플랜, 주문 화면의 금액을 함께 가립니다.
            </AppText>
          </View>
          <Pressable
            accessibilityLabel="금액 숨기기"
            accessibilityRole="switch"
            accessibilityState={{ checked: amountsHidden }}
            onPress={toggleAmounts}
            style={{
              backgroundColor: amountsHidden
                ? colors.brand.primary
                : colors.border.strong,
              borderRadius: radius.full,
              height: 28,
              justifyContent: 'center',
              padding: 3,
              width: 52,
            }}
          >
            <View
              style={{
                alignSelf: amountsHidden ? 'flex-end' : 'flex-start',
                backgroundColor: colors.surface.primary,
                borderRadius: radius.full,
                height: 22,
                width: 22,
              }}
            />
          </Pressable>
        </View>
      </Card>

      <Card variant="info">
        <AppText variant="heading">서비스 안내</AppText>
        <AppText tone="secondary" variant="body">
          표시되는 정보는 포트폴리오 시연을 위한 예시입니다.
        </AppText>
      </Card>
      {message ? <NoticeBanner title={message} variant="success" /> : null}
      <Button onPress={() => void logout()} variant="secondary">
        현재 세션 로그아웃
      </Button>
      {portfolioAccess === undefined ? null : (
        <Button onPress={() => void resetPortfolio()} variant="secondary">
          포트폴리오 처음부터 보기
        </Button>
      )}
      <DemoDisclosure />
    </>
  );

  return onBack ? (
    <FullScreenPage backIcon={backIcon} onBack={onBack} title="내 정보">
      {content}
    </FullScreenPage>
  ) : (
    <Screen>{content}</Screen>
  );
}

const styles = StyleSheet.create({
  fullScreenSubtitle: { marginBottom: spacing[2] },
  name: { marginTop: spacing[3] },
  riskButton: {
    alignItems: 'center',
    borderColor: colors.border.strong,
    borderRadius: radius.input,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  riskButtonSelected: {
    backgroundColor: colors.surface.warm,
    borderColor: colors.brand.primary,
  },
  riskRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[4],
  },
  rowCopy: { flex: 1, gap: spacing[1] },
});
