import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import { ConsultationScreen } from './consultation-screen';

describe('ConsultationScreen', () => {
  it('requires a method and time, then completes locally and returns home', async () => {
    const onBack = vi.fn();
    const onComplete = vi.fn();
    const view = await render(
      <ConsultationScreen
        backIcon={<></>}
        onBack={onBack}
        onComplete={onComplete}
      />,
    );
    const submit = view.getByRole('button', { name: '상담 요청하기' });
    expect(submit.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(view.getByRole('tab', { name: '전화' }));
    await fireEvent.press(view.getByRole('tab', { name: '오늘 19:00' }));
    const enabledSubmit = view.getByRole('button', { name: '상담 요청하기' });
    expect(enabledSubmit.props.accessibilityState).toEqual({ disabled: false });
    await fireEvent.press(enabledSubmit);

    expect(
      view.getByRole('header', { name: '상담 요청이 완료되었어요.' }),
    ).toBeTruthy();
    expect(view.getByText('전화 상담 · 오늘 19:00')).toBeTruthy();
    expect(
      view.getByText('포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.'),
    ).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: '코치 홈으로' }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onBack).not.toHaveBeenCalled();
  });
});
