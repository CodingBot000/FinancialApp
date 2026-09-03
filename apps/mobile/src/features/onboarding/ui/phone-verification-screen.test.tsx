import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { PhoneVerificationScreen } from './phone-verification-screen';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('PhoneVerificationScreen', () => {
  it('opens the carrier sheet after a phone number is entered', async () => {
    const onComplete = vi.fn();
    const view = await render(
      <PhoneVerificationScreen onComplete={onComplete} />,
    );

    expect(view.queryByText('통신사 선택')).toBeNull();
    const next = view.getByRole('button', { name: '다음' });
    expect(next.props.accessibilityState).toEqual({ disabled: true });

    await act(async () => {
      view.getByLabelText('휴대폰번호').props.onChangeText('01099841726');
    });

    expect(view.getByText('통신사 선택')).toBeTruthy();
    expect(view.getByText('SKT')).toBeTruthy();
    expect(view.getByText('LG U+ 알뜰폰')).toBeTruthy();
  });

  it('closes the sheet and enables the demo continuation after selection', async () => {
    const onComplete = vi.fn();
    const view = await render(
      <PhoneVerificationScreen onComplete={onComplete} />,
    );
    await act(async () => {
      view.getByLabelText('휴대폰번호').props.onChangeText('01099841726');
    });

    await act(async () => {
      view.getByRole('button', { name: 'SKT' }).props.onPress();
    });

    expect(view.queryByText('통신사 선택')).toBeNull();
    expect(view.getByText('SKT')).toBeTruthy();
    expect(
      view.getByRole('button', { name: '다음' }).props.accessibilityState,
    ).toEqual({ disabled: true });

    await act(async () => {
      view.getByLabelText('주민등록번호 앞자리').props.onChangeText('771011');
      view.getByLabelText('주민등록번호 뒷자리').props.onChangeText('1');
    });
    expect(view.getByLabelText('이름')).toBeTruthy();

    await act(async () => {
      view.getByLabelText('이름').props.onChangeText('이정훈');
    });
    expect(
      view.getByRole('button', { name: '다음' }).props.accessibilityState,
    ).toEqual({ disabled: false });

    await act(async () => {
      view.getByRole('button', { name: '다음' }).props.onPress();
    });
    expect(view.getByText('약관을 확인해주세요')).toBeTruthy();
    expect(
      view.getByRole('button', { name: '동의' }).props.accessibilityState,
    ).toEqual({ disabled: true });

    await act(async () => {
      view.getByRole('checkbox', { name: '전체 동의하기' }).props.onPress();
    });
    expect(
      view.getByRole('button', { name: '동의' }).props.accessibilityState,
    ).toEqual({ disabled: false });

    await act(async () => {
      view.getByRole('button', { name: '동의' }).props.onPress();
    });
    expect(view.getByText(/신규 간편비밀번호를/)).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('dismisses an open bottom sheet on Android back', async () => {
    const onComplete = vi.fn();
    const addEventListener = vi.spyOn(BackHandler, 'addEventListener');
    const view = await render(
      <PhoneVerificationScreen onComplete={onComplete} />,
    );

    await act(async () => {
      view.getByLabelText('휴대폰번호').props.onChangeText('01099841726');
    });

    const backHandler = addEventListener.mock.calls.at(-1)?.[1] as
      | (() => boolean)
      | undefined;
    expect(backHandler).toBeDefined();
    await act(async () => {
      expect(backHandler?.()).toBe(true);
    });
    expect(view.queryByText('통신사 선택')).toBeNull();
  });
});
