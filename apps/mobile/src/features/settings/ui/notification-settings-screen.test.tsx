import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { NotificationSettingsScreen } from './notification-settings-screen';

describe('NotificationSettingsScreen', () => {
  afterEach(cleanup);

  it('renders the notification settings content and handles back', async () => {
    const onBack = vi.fn();
    const view = await render(<NotificationSettingsScreen onBack={onBack} />);

    expect(view.getByText('알림 설정')).toBeTruthy();
    expect(view.getByText('서비스 이용 알림')).toBeTruthy();
    expect(
      view.getByText(
        '증여세 신고 일정, 공제한도 등 서비스 이용에 중요한 정보를 알려드려요.',
      ),
    ).toBeTruthy();
    expect(view.getByText('혜택 및 이벤트 알림')).toBeTruthy();
    expect(view.getByText('앱 푸시')).toBeTruthy();
    expect(view.getByText('알림톡/문자')).toBeTruthy();
    expect(view.getByText('전화')).toBeTruthy();
    expect(view.getByText('마케팅 정보 활용 동의')).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: '뒤로가기' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByLabelText('마케팅 정보 활용 동의'));
    expect(view.getByLabelText('마케팅 정보 활용 동의')).toBeTruthy();
  });
});
