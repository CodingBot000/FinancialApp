const CANONICAL_DECIMAL = /^-?[0-9]+(?:\.[0-9]+)?$/;

function decimal(value: string) {
  if (!CANONICAL_DECIMAL.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatWon(value: string, hidden = false) {
  if (hidden) return '••••원';
  const parsed = decimal(value);
  return parsed === undefined
    ? '금액 확인 필요'
    : `${Math.round(parsed).toLocaleString('ko-KR')}원`;
}

export function formatCompactWon(value: string, hidden = false) {
  if (hidden) return '••••만원';
  const parsed = decimal(value);
  return parsed === undefined
    ? '금액 확인 필요'
    : `${Math.round(parsed / 10_000).toLocaleString('ko-KR')}만원`;
}

export function formatQuantity(value: string) {
  const parsed = decimal(value);
  if (parsed === undefined) return '수량 확인 필요';
  return parsed.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}

export function isMaskedAccountIdentifier(value: string) {
  return value.includes('*') && !/^\d+$/.test(value.replaceAll('-', ''));
}
