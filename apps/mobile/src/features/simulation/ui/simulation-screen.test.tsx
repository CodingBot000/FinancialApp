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

    expect(view.getByLabelText('시작 자산').props.value).toBe('185400000');
    expect(view.getByLabelText('월 납입액').props.value).toBe('1500000');
    expect(view.getByLabelText('목표 금액').props.value).toBe('450000000');

    fireEvent.press(view.getByRole('button', { name: '미리보기 만들기' }));
    expect(await view.findByText('예상 결과')).toBeTruthy();
    expect(view.getByText('목표 달성 가능성 71%')).toBeTruthy();
    expect(view.getByLabelText(/예상 자산 범위 차트. 모션 감소/)).toBeTruthy();
    expect(create).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledOnce();

    fireEvent.press(view.getByRole('button', { name: '0개월 결과 보기' }));
    expect(await view.findByText(/0개월 기준/)).toBeTruthy();
  });

  it('blocks an invalid duration before starting a mutation', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const create = vi.spyOn(api, 'createSimulation');
    useSimulationDraftStore.getState().setField('durationMonths', '601');
    const view = await renderScreen(api);

    fireEvent.press(view.getByRole('button', { name: '미리보기 만들기' }));

    expect(
      await view.findByText('기간은 1~600개월의 정수여야 합니다.'),
    ).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});
