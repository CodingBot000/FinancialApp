import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native-reanimated', () => ({
  useReducedMotion: () => false,
}));
vi.mock('victory-native', () => ({
  CartesianChart: () => null,
  Line: () => null,
}));

import { PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { HealthScreen } from './health-screen';

async function renderHealthScreen(
  api: ContractMockPlatformApi,
  options: { readonly retry?: boolean } = {},
) {
  const queryClient = createMobileQueryClient();
  if (options.retry === false) {
    queryClient.setDefaultOptions({ queries: { retry: false } });
  }
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <HealthScreen />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  return { queryClient, view };
}

describe('HealthScreen', () => {
  it('renders loading and then the canonical ready state', async () => {
    const { view } = await renderHealthScreen(
      new ContractMockPlatformApi({ latencyMs: 10 }),
    );

    expect(view.getByText('연결을 확인하는 중')).toBeTruthy();
    expect(await view.findByText('서비스 준비 완료')).toBeTruthy();
    expect(view.getByText('baseline-v1')).toBeTruthy();
  });

  it('renders a retry action for a retryable failure', async () => {
    const { view } = await renderHealthScreen(
      new ContractMockPlatformApi({
        latencyMs: 0,
        scenario: 'rate-limited',
      }),
      { retry: false },
    );

    expect(await view.findByText('연결을 확인하지 못했습니다')).toBeTruthy();
    expect(
      view.getByRole('button', { name: '플랫폼 연결 다시 확인' }),
    ).toBeTruthy();
  });
});
