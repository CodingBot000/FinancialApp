import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { PlatformApiError, PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { CoachScreen } from './coach-screen';

function callbacks() {
  return {
    onOpenConsultation: vi.fn(),
    onOpenPlan: vi.fn(),
    onOpenRiskCheck: vi.fn(),
  };
}

async function renderCoach(
  api: ContractMockPlatformApi,
  queryClient = createMobileQueryClient(),
) {
  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: 0 },
  });
  const actions = callbacks();
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <CoachScreen {...actions} />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  return { actions, queryClient, view };
}

describe('CoachScreen', () => {
  it('shows the default insight, allocation comparison, actions, and disclosure', async () => {
    const { actions, view } = await renderCoach(
      new ContractMockPlatformApi({ latencyMs: 0 }),
    );

    expect(
      await view.findByText('균형형 기준보다 주식 비중이 32%p 높아요.'),
    ).toBeTruthy();
    expect(view.getByText('균형형 · 10년')).toBeTruthy();
    expect(
      view.getByText('월 150만원씩 투자하는 계획을 기준으로 살펴봤어요.'),
    ).toBeTruthy();
    expect(view.getByText('8% → 10%')).toBeTruthy();
    expect(view.getByText('0% → 30%')).toBeTruthy();
    expect(view.getByText('92% → 60%')).toBeTruthy();
    expect(
      view.getByLabelText(
        '현재 현금 8%, 채권 0%, 주식 92%. 제안 현금 10%, 채권 30%, 주식 60%.',
      ),
    ).toBeTruthy();
    expect(
      view.getByRole('header', {
        name: '균형형 기준보다 주식 비중이 32퍼센트포인트 높아요.',
      }),
    ).toBeTruthy();
    expect(
      view.getByText(
        '표시된 성향과 배분은 합성 데이터를 활용한 포트폴리오 예시이며 실제 투자 권유나 적합성 판단이 아닙니다.',
      ),
    ).toBeTruthy();

    await fireEvent.press(
      view.getByRole('button', { name: '투자 성향 다시 진단' }),
    );
    await fireEvent.press(
      view.getByRole('button', { name: '제안안으로 목표 확인' }),
    );
    await fireEvent.press(view.getByRole('button', { name: '코치 상담 요청' }));
    expect(actions.onOpenRiskCheck).toHaveBeenCalledOnce();
    expect(actions.onOpenPlan).toHaveBeenCalledOnce();
    expect(actions.onOpenConsultation).toHaveBeenCalledOnce();
  });

  it('shows the initial loading state without actions', async () => {
    const { view } = await renderCoach(
      new ContractMockPlatformApi({ latencyMs: 50 }),
    );
    expect(
      view.getByLabelText('자산과 투자 성향을 함께 확인하고 있어요.'),
    ).toBeTruthy();
    expect(view.queryByText('투자 성향 다시 진단')).toBeNull();
  });

  it('updates the insight and comparison from a changed risk profile', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    await api.updateRiskProfile({
      expectedVersion: '0',
      investmentHorizonMonths: 120,
      monthlyContribution: '1500000.0000',
      riskLevel: 'GROWTH',
    });
    const { view } = await renderCoach(api);

    expect(
      await view.findByText('성장형 기준보다 채권 비중이 15%p 낮아요.'),
    ).toBeTruthy();
    expect(view.getByText('8% → 5%')).toBeTruthy();
    expect(view.getByText('0% → 15%')).toBeTruthy();
    expect(view.getByText('92% → 80%')).toBeTruthy();
  });

  it('shows a retryable fatal error when no complete cached diagnosis exists', async () => {
    class FailedApi extends ContractMockPlatformApi {
      override getAssetSummary() {
        return Promise.reject(
          new PlatformApiError({
            kind: 'network',
            message: 'summary unavailable',
            retryable: false,
          }),
        );
      }
    }
    const { view } = await renderCoach(new FailedApi({ latencyMs: 0 }));
    expect(
      await view.findByText('코치 진단을 준비하지 못했습니다.'),
    ).toBeTruthy();
    expect(view.getByText('자산 정보를 다시 확인해 주세요.')).toBeTruthy();
    expect(view.getByRole('button', { name: '다시 확인' })).toBeTruthy();
  });

  it('keeps cached data visible and warns when a refresh partially fails', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const summary = await api.getAssetSummary();
    const profile = await api.getRiskProfile();
    vi.spyOn(api, 'getAssetSummary').mockRejectedValue(
      new PlatformApiError({
        kind: 'network',
        message: 'refresh failed',
        retryable: false,
      }),
    );
    const queryClient = createMobileQueryClient();
    queryClient.setQueryData(['wealth', 'summary'], summary);
    queryClient.setQueryData(['risk-profile'], profile);

    const { view } = await renderCoach(api, queryClient);
    expect(
      await view.findByText('일부 정보를 새로 확인하지 못했습니다.'),
    ).toBeTruthy();
    expect(view.getByText('8% → 10%')).toBeTruthy();
    expect(
      view.getByRole('button', { name: '제안안으로 목표 확인' }),
    ).toBeTruthy();
  });
});
