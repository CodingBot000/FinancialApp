import { View } from 'react-native';

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
import { usePlatformHealth } from '../hooks/use-platform-health';
import { ChartSmoke } from './chart-smoke';

export function HealthScreen() {
  const { retry, state } = usePlatformHealth();
  return (
    <Screen>
      <PageHeader
        subtitle="서비스 연결 상태와 자산 흐름을 확인합니다."
        title="Wealth Flow"
      />
      <Card>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <AppText variant="heading">서비스 상태</AppText>
          <StatusChip
            status={state.status === 'ready' ? 'FRESH' : state.status}
          />
        </View>
        {state.status === 'loading' ? (
          <LoadingState label="연결을 확인하고 있습니다." />
        ) : null}
        {state.status === 'ready' ? (
          <AppText style={{ marginTop: 12 }} tone="secondary" variant="body">
            서비스가 준비되었습니다.
          </AppText>
        ) : null}
        {state.status === 'error' ? (
          <ErrorState
            action={
              state.retryable ? (
                <Button onPress={retry}>다시 확인</Button>
              ) : undefined
            }
            description={state.message}
            title="연결을 확인하지 못했습니다."
          />
        ) : null}
      </Card>
      <Card>
        <AppText variant="heading">자산 흐름</AppText>
        <ChartSmoke />
      </Card>
      <DemoDisclosure />
    </Screen>
  );
}
