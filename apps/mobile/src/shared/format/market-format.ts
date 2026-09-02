export function formatMarketRate(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '등락률 확인 필요';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toLocaleString('ko-KR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}
