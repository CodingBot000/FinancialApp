import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useAuthSession } from '../../../shared/auth/auth-session-context';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  LoadingState,
  PageHeader,
  Screen,
  StatusChip,
} from '../../../shared/design-system';
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
    <Screen>
      <PageHeader
        subtitle="내 계정과 투자 성향을 확인합니다."
        title="내 정보"
      />
      <Card>
        {state.status === 'loading' ? (
          <LoadingState label="내 정보를 확인하고 있습니다." />
        ) : null}
        {state.status === 'ready' ? (
          <>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <AppText variant="heading">{state.user.displayName}</AppText>
              <StatusChip status={state.user.riskProfile} />
            </View>
            <AppText style={{ marginTop: 12 }} tone="secondary" variant="body">
              투자 성향 · {RISK_LABEL[state.user.riskProfile]}
            </AppText>
          </>
        ) : null}
        {state.status === 'error' ? (
          <ErrorState
            action={
              state.retryable ? (
                <Button onPress={retry}>다시 확인</Button>
              ) : undefined
            }
            description={state.message}
            title="내 정보를 확인하지 못했습니다."
          />
        ) : null}
      </Card>
      <Card variant="info">
        <AppText variant="heading">서비스 안내</AppText>
        <AppText tone="secondary" variant="body">
          표시되는 정보는 포트폴리오 시연을 위한 예시입니다.
        </AppText>
      </Card>
      <Button
        accessibilityLabel="로컬 세션 로그아웃"
        disabled={loggingOut}
        onPress={() => void logout()}
        variant="secondary"
      >
        {loggingOut ? '처리 중' : '로그아웃'}
      </Button>
      <DemoDisclosure />
    </Screen>
  );
}
