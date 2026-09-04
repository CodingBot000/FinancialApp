export type ConsultationMethod = 'PHONE' | 'VIDEO';
export type ConsultationTime =
  'TODAY_EVENING' | 'TOMORROW_AFTERNOON' | 'TOMORROW_EVENING';

export const CONSULTATION_METHODS: readonly Readonly<{
  label: string;
  value: ConsultationMethod;
}>[] = [
  { label: '전화', value: 'PHONE' },
  { label: '화상', value: 'VIDEO' },
];

export const CONSULTATION_TIMES: readonly Readonly<{
  label: string;
  value: ConsultationTime;
}>[] = [
  { label: '오늘 19:00', value: 'TODAY_EVENING' },
  { label: '내일 13:00', value: 'TOMORROW_AFTERNOON' },
  { label: '내일 19:00', value: 'TOMORROW_EVENING' },
];

export function consultationSelectionLabel(
  method: ConsultationMethod,
  time: ConsultationTime,
): string {
  const methodLabel = CONSULTATION_METHODS.find(
    (option) => option.value === method,
  )?.label;
  const timeLabel = CONSULTATION_TIMES.find(
    (option) => option.value === time,
  )?.label;
  return `${methodLabel ?? ''} 상담 · ${timeLabel ?? ''}`;
}
