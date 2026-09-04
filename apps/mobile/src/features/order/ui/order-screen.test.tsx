import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-local-authentication', () => ({
  authenticateAsync: vi.fn(),
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
}));

import {
  PlatformApiProvider,
  type Order,
  type Quote,
} from '../../../shared/api';
import { ContractMockPlatformApi } from '../../../shared/api/mock/contract-mock-platform-api';
import type { BiometricGate } from '../../../shared/auth';
import { createMobileQueryClient } from '../../../shared/query/query-client';
import { OrderScreen } from './order-screen';

async function renderScreen(
  api: ContractMockPlatformApi,
  biometricGate: BiometricGate,
) {
  const queryClient = createMobileQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const view = await render(
    <PlatformApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <OrderScreen biometricGate={biometricGate} />
      </QueryClientProvider>
    </PlatformApiProvider>,
  );
  return view;
}

const authenticatedGate: BiometricGate = {
  authenticate: () => Promise.resolve({ status: 'authenticated' }),
};

describe('OrderScreen', () => {
  it('requires biometric success and submits one POST with an opaque instrument ID', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const prepare = vi.spyOn(api, 'prepareBuyOrder');
    const view = await renderScreen(api, authenticatedGate);
    expect(await view.findByText('Synthetic Equity Fund')).toBeTruthy();
    expect(view.getByLabelText('매수금액(원)').props.value).toBe('1,000,000');

    await fireEvent(view.getByLabelText('매수금액(원)'), 'focus');
    expect(view.getByLabelText('매수금액(원)').props.value).toBe('1000000');
    await fireEvent.changeText(view.getByLabelText('매수금액(원)'), '1000000');
    await fireEvent(view.getByLabelText('매수금액(원)'), 'blur');
    expect(view.getByLabelText('매수금액(원)').props.value).toBe('1,000,000');

    fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));
    expect(await view.findByText('예상 매입좌수')).toBeTruthy();
    expect(view.getByText('가상 기준가(1,000좌)')).toBeTruthy();
    expect(view.getByText('8,000좌')).toBeTruthy();
    fireEvent.press(
      await view.findByRole('button', { name: '생체인증 후 매수 신청' }),
    );

    expect(await view.findByText('주문 상태')).toBeTruthy();
    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare.mock.calls[0]?.[0]).toMatchObject({
      instrumentId: 'c805563c-148c-4451-8a9a-4808da7b32ae',
      quantity: '8.00000000',
      side: 'BUY',
    });
    expect(prepare.mock.calls[0]?.[1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('does not submit before biometric authentication succeeds', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const prepare = vi.spyOn(api, 'prepareBuyOrder');
    const view = await renderScreen(api, {
      authenticate: () => Promise.resolve({ status: 'cancelled' }),
    });
    await view.findByText('Synthetic Equity Fund');
    fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));
    fireEvent.press(
      await view.findByRole('button', { name: '생체인증 후 매수 신청' }),
    );

    expect(
      await view.findByText('기기 생체인증이 완료되어야 주문할 수 있습니다.'),
    ).toBeTruthy();
    expect(prepare).not.toHaveBeenCalled();
  });

  it('validates the minimum won amount before requesting a quote', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const preview = vi.spyOn(api, 'previewBuyOrder');
    const view = await renderScreen(api, authenticatedGate);
    await view.findByText('Synthetic Equity Fund');

    await fireEvent.changeText(view.getByLabelText('매수금액(원)'), '9999');
    await fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));

    expect(
      await view.findByText('매수금액은 10,000원 이상이어야 해요.'),
    ).toBeTruthy();
    expect(preview).not.toHaveBeenCalled();
  });

  it('hides a stale preview and recalculates units after the amount changes', async () => {
    const api = new ContractMockPlatformApi({ latencyMs: 0 });
    const view = await renderScreen(api, authenticatedGate);
    await view.findByText('Synthetic Equity Fund');

    await fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));
    expect(await view.findByText('8,000좌')).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText('매수금액(원)'), '500,000');
    expect(view.queryByText('매수 예상')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));
    expect(await view.findByText('4,000좌')).toBeTruthy();
  });

  it('blocks an expired quote before biometric authentication or POST', async () => {
    class ExpiredQuoteApi extends ContractMockPlatformApi {
      override async previewBuyOrder(
        ...args: Parameters<ContractMockPlatformApi['previewBuyOrder']>
      ): Promise<Quote> {
        return {
          ...(await super.previewBuyOrder(...args)),
          expiresAt: '2020-01-01T00:00:00.000Z',
        };
      }
    }
    const api = new ExpiredQuoteApi({ latencyMs: 0 });
    const prepare = vi.spyOn(api, 'prepareBuyOrder');
    let biometricCalls = 0;
    const view = await renderScreen(api, {
      authenticate: () => {
        biometricCalls += 1;
        return Promise.resolve({ status: 'authenticated' });
      },
    });
    await view.findByText('Synthetic Equity Fund');
    fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));
    fireEvent.press(
      await view.findByRole('button', { name: '생체인증 후 매수 신청' }),
    );

    expect(
      await view.findByText('견적이 만료되었습니다. 새 견적을 확인하세요.'),
    ).toBeTruthy();
    expect(biometricCalls).toBe(0);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('recovers UNKNOWN through GET polling without another POST', async () => {
    class UnknownApi extends ContractMockPlatformApi {
      override async prepareBuyOrder(): Promise<Order> {
        const order = await super.getOrder('ignored');
        return {
          ...order,
          filledAmount: null,
          status: 'UNKNOWN',
          statusRefreshRecommendedAfterMs: 2000,
        };
      }
      override getOrder(): Promise<Order> {
        return new Promise(() => undefined);
      }
    }
    const api = new UnknownApi({ latencyMs: 0 });
    const prepare = vi.spyOn(api, 'prepareBuyOrder');
    const get = vi.spyOn(api, 'getOrder');
    const view = await renderScreen(api, authenticatedGate);
    await view.findByText('Synthetic Equity Fund');
    fireEvent.press(view.getByRole('button', { name: '매수 예상 확인' }));
    fireEvent.press(
      await view.findByRole('button', { name: '생체인증 후 매수 신청' }),
    );

    expect(await view.findByText('주문 상태')).toBeTruthy();
    expect(prepare).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledOnce();
  });
});
