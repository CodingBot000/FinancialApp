import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { OidcConfigurationScreen, OidcLoginScreen } from './oidc-login-screen';

describe('OidcLoginScreen', () => {
  it('shows browser progress and a safe cancellation state', async () => {
    let finishLogin: ((result: 'cancelled') => void) | undefined;
    const login = vi.fn(
      () =>
        new Promise<'cancelled'>((resolve) => {
          finishLogin = resolve;
        }),
    );
    const view = await render(<OidcLoginScreen login={login} />);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: '브라우저로 로그인' }));
    });
    expect(await view.findByText('브라우저 여는 중')).toBeTruthy();
    await act(async () => finishLogin?.('cancelled'));

    expect(await view.findByRole('alert')).toHaveTextContent(
      '로그인이 취소되었습니다. 준비되면 다시 시도해 주세요.',
    );
    expect(login).toHaveBeenCalledOnce();
  });

  it('renders a generic provider error without leaking details', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new Error('example-provider-detail'));
    const view = await render(<OidcLoginScreen login={login} />);

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: '브라우저로 로그인' }));
    });

    const alert = await view.findByRole('alert');
    expect(alert).toHaveTextContent(
      '로그인 요청을 완료하지 못했습니다. 연결 상태와 인증 설정을 확인해 주세요.',
    );
    expect(alert).not.toHaveTextContent('example-provider-detail');
  });

  it('lists only public config names when provider setup is missing', async () => {
    const view = await render(
      <OidcConfigurationScreen invalid={[]} missing={['clientId', 'issuer']} />,
    );

    expect(view.getByText('클라이언트 ID\n인증 서버 주소')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });
});
