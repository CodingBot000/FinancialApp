import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

import type { ConsultationSlot } from '../model/consultation-availability';
import { TimeSlotWheel } from './time-slot-wheel';

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

describe('TimeSlotWheel', () => {
  it('renders a vertical snap list with selected and full states', async () => {
    const onSelect = vi.fn();
    const view = await render(
      <TimeSlotWheel
        onSelect={onSelect}
        selectedSlotId="2026-09-07-1000"
        slots={slots}
      />,
    );

    expect(view.getByTestId('consultation-time-wheel').props).toMatchObject({
      snapToAlignment: 'start',
      snapToInterval: 64,
    });
    expect(view.getByText('오전')).toBeTruthy();
    expect(view.getByText('오후')).toBeTruthy();
    expect(view.getByText('저녁')).toBeTruthy();
    expect(
      view.getByRole('radio', { name: '10:00 상담 가능' }).props
        .accessibilityState,
    ).toEqual({ disabled: false, selected: true });
    expect(
      view.getByRole('radio', { name: '15:00 마감' }).props.accessibilityState,
    ).toEqual({ disabled: true, selected: false });

    await fireEvent.press(view.getByRole('radio', { name: '19:00 상담 가능' }));
    expect(onSelect).toHaveBeenCalledWith(slots[2]);
  });
});
