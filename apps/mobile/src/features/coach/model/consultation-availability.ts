import { addDays, format, getDay, parseISO, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

export type ConsultationPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type ConsultationSlotStatus = 'AVAILABLE' | 'FULL';

export interface ConsultationSlot {
  readonly slotId: string;
  readonly date: string;
  readonly label: string;
  readonly period: ConsultationPeriod;
  readonly status: ConsultationSlotStatus;
}

export interface ConsultationDay {
  readonly date: string;
  readonly label: string;
  readonly slots: readonly ConsultationSlot[];
}

const AVAILABILITY_WINDOW_DAYS = 14;

const WEEKDAY_TIMES = ['10:00', '13:00', '15:00', '19:00'] as const;
const SATURDAY_TIMES = ['10:00', '13:00'] as const;

function periodForTime(label: string): ConsultationPeriod {
  if (label === '10:00') return 'MORNING';
  if (label === '13:00' || label === '15:00') return 'AFTERNOON';
  return 'EVENING';
}

function isFullSlot(dayOffset: number, label: string): boolean {
  return (
    (dayOffset === 2 && label === '15:00') ||
    (dayOffset === 5 && label === '19:00')
  );
}

export function formatConsultationDate(date: string): string {
  return format(parseISO(date), 'M월 d일 (EEE)', { locale: ko });
}

export function createDemoConsultationAvailability(
  referenceDate: Date = new Date(),
): readonly ConsultationDay[] {
  const firstDate = startOfDay(addDays(referenceDate, 1));

  return Array.from({ length: AVAILABILITY_WINDOW_DAYS }, (_, dayOffset) => {
    const date = addDays(firstDate, dayOffset);
    const dateString = format(date, 'yyyy-MM-dd');
    const dayOfWeek = getDay(date);
    const times =
      dayOfWeek === 0 ? [] : dayOfWeek === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES;

    return {
      date: dateString,
      label: formatConsultationDate(dateString),
      slots: times.map((label) => ({
        date: dateString,
        label,
        period: periodForTime(label),
        slotId: `${dateString}-${label.replace(':', '')}`,
        status: isFullSlot(dayOffset, label) ? 'FULL' : 'AVAILABLE',
      })),
    };
  });
}
