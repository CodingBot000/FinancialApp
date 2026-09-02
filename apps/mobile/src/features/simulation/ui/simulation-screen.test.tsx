import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-reanimated', () => ({
  useReducedMotion: () => true,
}));

import { PlatformApiProvider } from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { useSimulationDraftStore } from '../model/simulation-draft-store';
import { SimulationScreen } from './simulation-screen';

async function renderScreen(api: ContractMockPlatformApi) {
  const queryClient = createMobileQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <SimulationScreen />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  return view;
}

describe('SimulationScreen', () => {
  beforeEach(() => useSimulationDraftStore.getState().reset());

  it('submits the draft and displays only the persisted server result', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const create = vi.spyOn(api, 'createSimulation');
    const get = vi.spyOn(api, 'getSimulation');
    const view = await renderScreen(api);

    fireEvent.press(view.getByRole('button', { name: '시뮬레이션 실행' }));
    expect(await view.findByText('서버 저장 결과')).toBeTruthy();
    expect(view.getByText('목표 달성 확률 71%')).toBeTruthy();
    expect(view.getByText(/계산 엔진 1.0.0/)).toBeTruthy();
    expect(view.getByText(/기본 데이터셋 1/)).toBeTruthy();
    expect(
      view.getByLabelText(/하위 10%, 중앙값, 상위 90% 백분위 차트. 모션 감소/),
    ).toBeTruthy();
    expect(create).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledOnce();

    fireEvent.press(view.getByRole('button', { name: '0개월 결과 보기' }));
    expect(await view.findByText(/0개월 · 하위 10%/)).toBeTruthy();
  });

  it('blocks an invalid duration before starting a mutation', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const create = vi.spyOn(api, 'createSimulation');
    useSimulationDraftStore.getState().setField('durationMonths', '601');
    const view = await renderScreen(api);

    fireEvent.press(view.getByRole('button', { name: '시뮬레이션 실행' }));

    expect(
      await view.findByText('기간은 1~600개월의 정수여야 합니다.'),
    ).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});
