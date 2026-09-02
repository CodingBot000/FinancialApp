import { AppText, type AppTextTone } from './app-text';
import { formatWon } from '../../format/finance-format';

export function MoneyValue({
  accessibilityLabel,
  currency = 'KRW',
  hidden = false,
  signed = false,
  size = 'medium',
  tone = 'primary',
  value,
}: {
  readonly accessibilityLabel?: string;
  readonly currency?: 'KRW' | 'USD';
  readonly hidden?: boolean;
  readonly signed?: boolean;
  readonly size?: 'hero' | 'large' | 'medium' | 'small';
  readonly tone?: 'primary' | 'marketUp' | 'marketDown' | 'muted';
  readonly value: number | string;
}) {
  const appTone: AppTextTone = tone === 'muted' ? 'secondary' : tone;
  const formatted =
    currency === 'KRW' ? formatWon(String(value), hidden) : String(value);
  const display =
    !hidden && signed && Number(value) > 0 ? `+${formatted}` : formatted;
  return (
    <AppText
      accessibilityLabel={accessibilityLabel}
      tone={appTone}
      variant={
        size === 'hero'
          ? 'amountHero'
          : size === 'large'
            ? 'title2'
            : size === 'small'
              ? 'label'
              : 'heading'
      }
    >
      {display}
    </AppText>
  );
}
