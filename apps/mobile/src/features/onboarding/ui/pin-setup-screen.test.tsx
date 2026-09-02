import { act, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { PinSetupScreen } from './pin-setup-screen';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('PinSetupScreen', () => {
  async function enter(
    view: Awaited<ReturnType<typeof render>>,
    value: string,
  ) {
    for (const digit of value) {
      await act(async () => {
        view.getByRole('button', { name: `숫자 ${digit}` }).props.onPress();
      });
    }
  }

  it('randomizes the keypad and moves to confirmation after six digits', async () => {
    const view = await render(<PinSetupScreen onComplete={vi.fn()} />);

    expect(view.getByText(/신규 간편비밀번호를/)).toBeTruthy();
    expect(view.getByRole('button', { name: '숫자 0' })).toBeTruthy();
    expect(
      view.getByRole('button', { name: '입력한 비밀번호 지우기' }),
    ).toBeTruthy();

    await enter(view, '012345');

    expect(view.getByText('간편비밀번호 확인')).toBeTruthy();
    expect(view.getByLabelText('비밀번호 0자리 입력됨')).toBeTruthy();
  });

  it('shows an error for a mismatch and completes after a matching retry', async () => {
    const onComplete = vi.fn();
    const view = await render(<PinSetupScreen onComplete={onComplete} />);

    await enter(view, '012345');
    await enter(view, '543210');
    expect(
      view.getByText('간편비밀번호가 일치하지 않아요. 다시 입력해주세요.'),
    ).toBeTruthy();
    expect(view.getByLabelText('비밀번호 0자리 입력됨')).toBeTruthy();

    await act(async () => {
      view.getByRole('button', { name: '숫자 0' }).props.onPress();
      view
        .getByRole('button', { name: '입력한 비밀번호 지우기' })
        .props.onPress();
    });
    expect(view.getByLabelText('비밀번호 0자리 입력됨')).toBeTruthy();

    await enter(view, '012345');
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
