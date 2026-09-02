import { AppText } from './app-text';

export function MetricValue({
  accessibilityLabel,
  suffix = '',
  value,
}: {
  readonly accessibilityLabel?: string;
  readonly suffix?: string;
  readonly value: string;
}) {
  return (
    <AppText accessibilityLabel={accessibilityLabel} variant="amountHero">
      {value}
      {suffix}
    </AppText>
  );
}
