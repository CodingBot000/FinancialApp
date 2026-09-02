import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  AppText,
  BottomBar,
  Button,
  DemoDisclosure,
  FullScreenLayer,
  MarketChange,
  MoneyValue,
  SegmentedControl,
  StatusChip,
} from './index';
import { colors, palette, radius, typography } from '../tokens';

describe('design system primitives', () => {
  it('provides a reusable full-screen layer header', async () => {
    const onBack = vi.fn();
    const view = await render(
      <FullScreenLayer backIcon={<></>} onBack={onBack} title="알림함">
        <AppText>레이어 본문</AppText>
      </FullScreenLayer>,
    );
    fireEvent.press(view.getByRole('button', { name: '뒤로가기' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(view.getByRole('header', { name: '알림함' })).toBeTruthy();
    expect(view.getByText('레이어 본문')).toBeTruthy();
  });

  it('keeps the screenshot-aligned visual foundation stable', () => {
    expect(colors.background.screen).toBe('#FFFFFF');
    expect(colors.text.primary).toBe('#0E0E0E');
    expect(colors.text.secondary).toBe('#707070');
    expect(colors.surface.subtle).toBe('#F4F4F4');
    expect(colors.brand.primary).toBe('#F37321');
    expect(palette.neutral300).toBe('#D0D0D0');
    expect(typography.amountHero.fontWeight).toBe('700');
    expect(typography.body.fontSize).toBe(16);
    expect(radius.card).toBe(20);
    expect(colors.background.splash).toBe('#000000');
    expect(colors.text.splash).toBe('#8D8D8D');
  });

  it('keeps the shared bottom bar content-sized', async () => {
    const view = await render(
      <BottomBar>
        <AppText>하단 콘텐츠</AppText>
      </BottomBar>,
    );
    expect(view.getByLabelText('하단 메뉴')).toBeTruthy();
    expect(view.getByText('하단 콘텐츠')).toBeTruthy();
  });

  it('renders a privacy-safe money value and signed market change', async () => {
    const hidden = await render(<MoneyValue hidden value="1250000" />);
    expect(hidden.getByText('••••원')).toBeTruthy();

    const change = await render(
      <MarketChange changePrice="1200" changeRate="1.2" />,
    );
    expect(change.getByText(/상승/)).toBeTruthy();
    expect(change.getByLabelText('상승 +1,200원 +1.20%')).toBeTruthy();
  });

  it('exposes disabled/loading button state', async () => {
    const onPress = vi.fn();
    const view = await render(
      <Button loading onPress={onPress}>
        저장
      </Button>,
    );
    const button = view.getByRole('button');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('selects a single segmented option and maps status labels', async () => {
    const onChange = vi.fn();
    const view = await render(
      <>
        <SegmentedControl
          onChange={onChange}
          options={[
            { label: '1개월', value: '1' },
            { label: '3개월', value: '3' },
          ]}
          value="1"
        />
        <StatusChip status="FILLED" />
        <DemoDisclosure />
      </>,
    );
    expect(
      view.getByRole('tab', { name: '1개월' }).props.accessibilityState,
    ).toEqual({ selected: true });
    fireEvent.press(view.getByRole('tab', { name: '3개월' }));
    expect(onChange).toHaveBeenCalledWith('3');
    expect(view.getByText('체결')).toBeTruthy();
    expect(
      view.getByText(
        '데이터는 포트폴리오 시연을 위한 예시이며 실제 금융계좌와 연결되지 않습니다.',
      ),
    ).toBeTruthy();
  });
});
