import { describe, expect, it } from 'vitest';

import { createDemoConsultationAvailability } from './consultation-availability';

describe('createDemoConsultationAvailability', () => {
  const referenceDate = new Date(2026, 8, 4);

  it('creates a deterministic two-week window starting tomorrow', () => {
    const days = createDemoConsultationAvailability(referenceDate);

    expect(days).toHaveLength(14);
    expect(days[0]?.date).toBe('2026-09-05');
    expect(days.at(-1)?.date).toBe('2026-09-18');
    expect(createDemoConsultationAvailability(referenceDate)).toEqual(days);
  });

  it('uses weekday, Saturday and Sunday availability rules', () => {
    const days = createDemoConsultationAvailability(referenceDate);

    expect(days.find((day) => day.date === '2026-09-05')?.slots).toHaveLength(
      2,
    );
    expect(days.find((day) => day.date === '2026-09-06')?.slots).toHaveLength(
      0,
    );
    expect(days.find((day) => day.date === '2026-09-07')?.slots).toHaveLength(
      4,
    );
  });

  it('includes a full slot so the disabled state is visible in the demo', () => {
    const days = createDemoConsultationAvailability(referenceDate);
    const monday = days.find((day) => day.date === '2026-09-07');

    expect(monday?.slots.find((slot) => slot.label === '15:00')?.status).toBe(
      'FULL',
    );
  });
});
