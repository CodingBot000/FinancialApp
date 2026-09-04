import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-reanimated', () => ({
  useReducedMotion: () => true,
}));

import { PlatformApiError, PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { useSimulationDraftStore } from '../model/simulation-draft-store';
import { SimulationScreen } from './simulation-screen';

async function renderScreen(api: ContractMockPlatformApi) {
  const queryClient = createMobileQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const onBack = vi.fn();
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <SimulationScreen backIcon={<></>} onBack={onBack} />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  return { onBack, view };
}

describe('SimulationScreen', () => {
  beforeEach(() => useSimulationDraftStore.getState().reset());

  it('submits the balanced allocation and displays only the persisted server result', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const create = vi.spyOn(api, 'createSimulation');
    const get = vi.spyOn(api, 'getSimulation');
    const { view } = await renderScreen(api);

    expect((await view.findByLabelText('시작 자산')).props.value).toBe(
      '185400000',
    );
    expect(view.getByLabelText('월 납입액').props.value).toBe('1500000');
    expect(view.getByLabelText('목표 금액').props.value).toBe('450000000');
    expect(view.getByText('현금 10% · 채권 30% · 주식 60%')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: '목표 결과 확인' }));
    expect(await view.findByText('예상 결과')).toBeTruthy();
    expect(view.getByText('목표 달성 가능성 71%')).toBeTruthy();
    expect(view.getByLabelText(/예상 자산 범위 차트. 모션 감소/)).toBeTruthy();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        allocation: [
          { assetClass: 'CASH', weight: 0.1 },
          { assetClass: 'BOND', weight: 0.3 },
          { assetClass: 'EQUITY', weight: 0.6 },
        ],
      }),
    );
    expect(get).toHaveBeenCalledOnce();

    await fireEvent.press(
      view.getByRole('button', { name: '0개월 결과 보기' }),
    );
    expect(await view.findByText(/0개월 기준/)).toBeTruthy();
  });

  it('uses the growth allocation for both the visible summary and submit payload', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    await api.updateRiskProfile({
      expectedVersion: '0',
      investmentHorizonMonths: 120,
      monthlyContribution: '1500000.0000',
      riskLevel: 'GROWTH',
    });
    const create = vi.spyOn(api, 'createSimulation');
    const { view } = await renderScreen(api);

    expect(await view.findByText('현금 5% · 채권 15% · 주식 80%')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: '목표 결과 확인' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0].allocation).toEqual([
      { assetClass: 'CASH', weight: 0.05 },
      { assetClass: 'BOND', weight: 0.15 },
      { assetClass: 'EQUITY', weight: 0.8 },
    ]);
  });

  it('warns and submits the balanced fallback when the profile cannot load', async () => {
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
    const api = new FailedProfileApi({ latencyMs: 0 });
    const create = vi.spyOn(api, 'createSimulation');
    const { view } = await renderScreen(api);

    expect(
      await view.findByText('투자 성향을 확인하지 못했습니다.'),
    ).toBeTruthy();
    expect(
      view.getByText('균형형 예시 배분으로 목표 결과를 확인합니다.'),
    ).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: '목표 결과 확인' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0].allocation).toEqual([
      { assetClass: 'CASH', weight: 0.1 },
      { assetClass: 'BOND', weight: 0.3 },
      { assetClass: 'EQUITY', weight: 0.6 },
    ]);
  });

  it('blocks an invalid duration before starting a mutation', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const create = vi.spyOn(api, 'createSimulation');
    useSimulationDraftStore.getState().setField('durationMonths', '601');
    const { view } = await renderScreen(api);

    await fireEvent.press(
      await view.findByRole('button', { name: '목표 결과 확인' }),
    );

    expect(
      await view.findByText('기간은 1~600개월의 정수여야 합니다.'),
    ).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('provides back navigation and the explicit simulation disclosure', async () => {
    const { onBack, view } = await renderScreen(
      new ContractMockPlatformApi({ latencyMs: 0 }),
    );
    await fireEvent.press(view.getByRole('button', { name: '뒤로가기' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(
      view.getByText(
        '합성 데이터를 사용한 예상 결과이며 실제 수익이나 투자 성과를 보장하지 않습니다.',
      ),
    ).toBeTruthy();
  });
});
