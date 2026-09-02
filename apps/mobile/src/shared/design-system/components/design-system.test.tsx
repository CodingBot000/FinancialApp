import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  Button,
  DemoDisclosure,
  MarketChange,
  MoneyValue,
  SegmentedControl,
  StatusChip,
} from './index';

describe('design system primitives', () => {
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
