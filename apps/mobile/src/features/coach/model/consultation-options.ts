export type ConsultationMethod = 'PHONE' | 'VIDEO';

export const CONSULTATION_METHODS: readonly Readonly<{
  label: string;
  value: ConsultationMethod;
}>[] = [
  { label: '전화', value: 'PHONE' },
  { label: '화상', value: 'VIDEO' },
];

export function consultationSelectionLabel({
  dateLabel,
  method,
  slotLabel,
}: {
  readonly dateLabel: string;
  readonly method: ConsultationMethod;
  readonly slotLabel: string;
}): string {
  const methodLabel = CONSULTATION_METHODS.find(
    (option) => option.value === method,
  )?.label;
  return `${dateLabel} · ${slotLabel} · ${methodLabel ?? ''} 상담`;
}
