import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

import type { ConsultationSlot } from '../model/consultation-availability';
import { TimeSlotPicker } from './time-slot-picker';

const slots: readonly ConsultationSlot[] = [
  {
    date: '2026-09-07',
    label: '10:00',
    period: 'MORNING',
    slotId: '2026-09-07-1000',
    status: 'AVAILABLE',
  },
  {
    date: '2026-09-07',
    label: '15:00',
    period: 'AFTERNOON',
    slotId: '2026-09-07-1500',
    status: 'FULL',
  },
  {
    date: '2026-09-07',
    label: '19:00',
    period: 'EVENING',
    slotId: '2026-09-07-1900',
    status: 'AVAILABLE',
  },
];

describe('TimeSlotPicker', () => {
  it('keeps the picker closed until the text trigger is pressed', async () => {
    const onSelect = vi.fn();
    const view = await render(
      <TimeSlotPicker
        onSelect={onSelect}
        selectedSlotId="2026-09-07-1000"
        slots={slots}
      />,
    );

    expect(view.getByText('선택된 시간')).toBeTruthy();
    expect(view.getByText('10:00')).toBeTruthy();
    expect(view.queryByTestId('consultation-time-picker-modal')).toBeNull();

    await fireEvent.press(view.getByTestId('consultation-time-trigger'));
    expect(view.getByTestId('consultation-time-picker-modal')).toBeTruthy();
    expect(view.getByTestId('consultation-time-wheel').props).toMatchObject({
      snapToInterval: 56,
    });
    expect(view.getByRole('button', { name: '시간 선택 닫기' })).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: '19:00 상담 가능' }));
    await fireEvent.press(view.getByRole('button', { name: '선택 완료' }));

    expect(onSelect).toHaveBeenCalledWith(slots[2]);
    expect(view.queryByTestId('consultation-time-picker-modal')).toBeNull();
  });

  it('closes without changing the selected slot when the close action is pressed', async () => {
    const onSelect = vi.fn();
    const view = await render(
      <TimeSlotPicker
        onSelect={onSelect}
        selectedSlotId="2026-09-07-1000"
        slots={slots}
      />,
    );

    await fireEvent.press(view.getByTestId('consultation-time-trigger'));
    await fireEvent.press(view.getByRole('button', { name: '시간 선택 닫기' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(view.getByText('10:00')).toBeTruthy();
    expect(view.queryByTestId('consultation-time-picker-modal')).toBeNull();
  });
});
