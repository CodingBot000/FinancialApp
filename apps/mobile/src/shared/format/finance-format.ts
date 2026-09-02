const CANONICAL_DECIMAL = /^-?[0-9]+(?:\.[0-9]+)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_TIME_ZONE = 'Asia/Seoul';

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

export function formatDate(value: string | null | undefined): string {
  if (value === null || value === undefined) return '날짜 없음';
  if (DATE_ONLY.test(value)) return value;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '날짜 확인 필요';

  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '날짜 확인 필요';
}

export function formatDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined) return '아직 없음';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '날짜 확인 필요';

  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  if (
    !values.year ||
    !values.month ||
    !values.day ||
    !values.hour ||
    !values.minute
  ) {
    return '날짜 확인 필요';
  }
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}
