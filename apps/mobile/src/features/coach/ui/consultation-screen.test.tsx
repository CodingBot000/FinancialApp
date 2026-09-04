import { fireEvent, render } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('react-native-calendars', () => ({
  Calendar: ({
    onDayPress,
    testID,
  }: {
    readonly onDayPress: (date: { readonly dateString: string }) => void;
    readonly testID: string;
  }) => (
    <>
      <Pressable
        onPress={() => onDayPress({ dateString: '2026-09-05' })}
        testID={`${testID}.day_2026-09-05`}
      />
      <Pressable
        onPress={() => onDayPress({ dateString: '2026-09-07' })}
        testID={`${testID}.day_2026-09-07`}
      />
    </>
  ),
  LocaleConfig: { defaultLocale: undefined, locales: {} },
}));

import { ConsultationScreen } from './consultation-screen';

describe('ConsultationScreen', () => {
  it('selects a date and slot, then completes locally and returns home', async () => {
    const onBack = vi.fn();
    const onComplete = vi.fn();
    const onRequestNotification = vi.fn();
    const view = await render(
      <ConsultationScreen
        backIcon={<></>}
        onBack={onBack}
        onComplete={onComplete}
        onRequestNotification={onRequestNotification}
        referenceDate={new Date(2026, 8, 4)}
      />,
    );
    const submit = view.getByRole('button', { name: '상담 요청하기' });
    expect(submit.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(
      view.getByTestId('coach-consultation-calendar.day_2026-09-05'),
    );
    expect(view.getByText('선택한 날짜 · 9월 5일 (토)')).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: '10:00 상담 가능' }));
    await fireEvent.press(view.getByRole('tab', { name: '전화' }));
    const enabledSubmit = view.getByRole('button', { name: '상담 요청하기' });
    expect(enabledSubmit.props.accessibilityState).toEqual({ disabled: false });
    expect(view.getByText('9월 5일 (토) · 10:00 · 전화 상담')).toBeTruthy();

    await fireEvent.press(enabledSubmit);

    expect(onRequestNotification).toHaveBeenCalledWith(
      '9월 5일 (토) · 10:00 · 전화 상담',
    );
    expect(
      view.getByRole('header', { name: '상담 요청이 완료되었어요.' }),
    ).toBeTruthy();
    expect(
      view.getByText('포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.'),
    ).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: '코치 홈으로' }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('resets the selected slot when the date changes and disables full slots', async () => {
    const view = await render(
      <ConsultationScreen
        backIcon={<></>}
        onBack={vi.fn()}
        onComplete={vi.fn()}
        onRequestNotification={vi.fn()}
        referenceDate={new Date(2026, 8, 4)}
      />,
    );

    await fireEvent.press(
      view.getByTestId('coach-consultation-calendar.day_2026-09-05'),
    );
    await fireEvent.press(view.getByRole('radio', { name: '10:00 상담 가능' }));
    expect(
      view.getByRole('radio', { name: '10:00 상담 가능' }).props
        .accessibilityState,
    ).toEqual({ disabled: false, selected: true });

    await fireEvent.press(
      view.getByTestId('coach-consultation-calendar.day_2026-09-07'),
    );
    expect(
      view.getByRole('radio', { name: '10:00 상담 가능' }).props
        .accessibilityState,
    ).toEqual({ disabled: false, selected: false });
    expect(
      view.getByRole('radio', { name: '15:00 마감' }).props.accessibilityState,
    ).toEqual({ disabled: true, selected: false });
  });
});
