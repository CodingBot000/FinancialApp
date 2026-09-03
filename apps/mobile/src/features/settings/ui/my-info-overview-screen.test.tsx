import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-router', () => ({
  useRouter: () => ({ push }),
}));

import { MyInfoOverviewScreen } from './my-info-overview-screen';

describe('MyInfoOverviewScreen', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('matches the settings overview content and links the requested routes', async () => {
    const view = await render(<MyInfoOverviewScreen />);

    expect(view.getByText('내정보')).toBeTruthy();
    expect(view.getByText('내 정보 관리')).toBeTruthy();
    expect(view.getByText('알림 설정')).toBeTruthy();
    expect(view.getByText('간편비밀번호 변경')).toBeTruthy();
    expect(view.getByText('공지사항')).toBeTruthy();
    expect(view.getByText('문의하기')).toBeTruthy();
    expect(view.getByText('브랜드')).toBeTruthy();
    expect(view.getByLabelText('WM 로고')).toBeTruthy();

    fireEvent.press(view.getByLabelText('내 정보 관리'));
    expect(push).toHaveBeenCalledWith('/my-info-management');

    fireEvent.press(view.getByLabelText('알림 설정'));
    expect(push).toHaveBeenCalledWith('/notification-settings');

    fireEvent.press(view.getByLabelText('공지사항'));
    expect(push).toHaveBeenCalledTimes(2);
  });
});
