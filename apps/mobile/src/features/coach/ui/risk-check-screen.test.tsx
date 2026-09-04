import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  PlatformApiError,
  PlatformApiProvider,
  type UserRiskProfile,
} from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { RiskCheckScreen } from './risk-check-screen';

async function renderRiskCheck(api: ContractMockPlatformApi) {
  const queryClient = createMobileQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const onBack = vi.fn();
  const onComplete = vi.fn();
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <RiskCheckScreen
          backIcon={<></>}
          onBack={onBack}
          onComplete={onComplete}
        />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  await view.findByRole('tab', { name: '일부 매도' });
  return { onBack, onComplete, queryClient, view };
}

type RiskCheckView = Awaited<ReturnType<typeof renderRiskCheck>>['view'];

async function answer(
  view: RiskCheckView,
  choices: readonly [string, string, string],
) {
  for (const choice of choices) {
    await fireEvent.press(view.getByRole('tab', { name: choice }));
  }
  await fireEvent.press(view.getByRole('button', { name: '진단 결과 확인' }));
}

describe('RiskCheckScreen', () => {
  it('disables result calculation until every question is answered', async () => {
    const { view } = await renderRiskCheck(
      new ContractMockPlatformApi({ latencyMs: 0 }),
    );
    expect(
      view.getByRole('button', { name: '진단 결과 확인' }).props
        .accessibilityState,
    ).toEqual({ disabled: true });
  });

  it.each([
    [['일부 매도', '3년 이내', '안정 우선'], '안정형'],
    [['추가 투자', '3년 이내', '안정 우선'], '안정형'],
    [['그대로 유지한다', '3~7년', '균형'], '균형형'],
    [['추가 투자', '7년 이후', '안정 우선'], '균형형'],
    [['추가 투자', '7년 이후', '균형'], '성장형'],
    [['추가 투자', '7년 이후', '성장 우선'], '성장형'],
  ] as const)('maps questionnaire answers to %s', async (choices, expected) => {
    const { view } = await renderRiskCheck(
      new ContractMockPlatformApi({ latencyMs: 0 }),
    );
    await answer(view, choices);
    expect(view.getByRole('header', { name: expected })).toBeTruthy();
  });

  it('recalculates a visible result when an answer changes', async () => {
    const { view } = await renderRiskCheck(
      new ContractMockPlatformApi({ latencyMs: 0 }),
    );
    await answer(view, ['일부 매도', '3년 이내', '안정 우선']);
    expect(view.getByRole('header', { name: '안정형' })).toBeTruthy();

    await fireEvent.press(view.getByRole('tab', { name: '추가 투자' }));
    await fireEvent.press(view.getByRole('tab', { name: '7년 이후' }));
    await fireEvent.press(view.getByRole('tab', { name: '성장 우선' }));
    expect(view.getByRole('header', { name: '성장형' })).toBeTruthy();
  });

  it('preserves the existing contribution and version in the update payload', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const update = vi.spyOn(api, 'updateRiskProfile');
    const { onComplete, queryClient, view } = await renderRiskCheck(api);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await answer(view, ['추가 투자', '7년 이후', '성장 우선']);

    await fireEvent.press(
      view.getByRole('button', { name: '이 성향으로 코칭 받기' }),
    );
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith({
      expectedVersion: '0',
      investmentHorizonMonths: 120,
      monthlyContribution: '1500000.0000',
      riskLevel: 'GROWTH',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['current-user'] });
    expect(queryClient.getQueryData(['risk-profile'])).toMatchObject({
      riskLevel: 'GROWTH',
    });
  });

  it('keeps answers locked and submit disabled while saving', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const currentProfile = await api.getRiskProfile();
    let resolveUpdate: ((updatedProfile: UserRiskProfile) => void) | undefined;
    const update = vi.spyOn(api, 'updateRiskProfile').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const { onComplete, view } = await renderRiskCheck(api);
    await answer(view, ['추가 투자', '7년 이후', '성장 우선']);
    const save = view.getByRole('button', {
      name: '이 성향으로 코칭 받기',
    });

    await fireEvent.press(save);
    await waitFor(() => {
      expect(
        view.getByRole('button', { name: '이 성향으로 코칭 받기' }).props
          .accessibilityState,
      ).toEqual({ disabled: true });
    });
    await fireEvent.press(view.getByRole('tab', { name: '일부 매도' }));

    expect(update).toHaveBeenCalledOnce();
    expect(
      view.getByRole('tab', { name: '추가 투자' }).props.accessibilityState,
    ).toEqual({ selected: true });
    await act(async () => {
      resolveUpdate?.({
        ...currentProfile,
        riskLevel: 'GROWTH',
        version: '1',
      });
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it('keeps answers and the calculated result after a save error', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    vi.spyOn(api, 'updateRiskProfile').mockRejectedValueOnce(
      new PlatformApiError({
        kind: 'network',
        message: 'save unavailable',
        retryable: false,
      }),
    );
    const { onComplete, view } = await renderRiskCheck(api);
    await answer(view, ['그대로 유지한다', '3~7년', '균형']);
    await fireEvent.press(
      view.getByRole('button', { name: '이 성향으로 코칭 받기' }),
    );

    expect(
      await view.findByText('진단 결과를 저장하지 못했습니다.'),
    ).toBeTruthy();
    expect(view.getByRole('header', { name: '균형형' })).toBeTruthy();
    expect(
      view.getByRole('tab', { name: '그대로 유지한다' }).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not expose answers when the existing profile cannot load', async () => {
    class FailedProfileApi extends ContractMockPlatformApi {
      override getRiskProfile() {
        return Promise.reject(
          new PlatformApiError({
            kind: 'network',
            message: 'profile unavailable',
            retryable: false,
          }),
        );
      }
    }
    const queryClient = createMobileQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    const view = await render(
      <PlatformApiProvider api={new FailedProfileApi({ latencyMs: 0 })}>
        <QueryClientProvider client={queryClient}>
          <RiskCheckScreen
            backIcon={<></>}
            onBack={vi.fn()}
            onComplete={vi.fn()}
          />
        </QueryClientProvider>
      </PlatformApiProvider>,
    );
    expect(
      await view.findByText('투자 성향을 확인하지 못했습니다.'),
    ).toBeTruthy();
    expect(view.queryByRole('tab', { name: '일부 매도' })).toBeNull();
  });
});
