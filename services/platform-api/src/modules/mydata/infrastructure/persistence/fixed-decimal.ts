function parseFixed(value: string, scale: number): bigint {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (match === null) throw new Error('Institution decimal value is invalid.');
  const fraction = match[3] ?? '';
  if (fraction.length > scale) {
    throw new Error(
      'Institution decimal precision exceeds the supported scale.',
    );
  }
  const sign = match[1] === '-' ? -1n : 1n;
  const units = BigInt(match[2] ?? '0') * 10n ** BigInt(scale);
  const decimals = BigInt(fraction.padEnd(scale, '0') || '0');
  return sign * (units + decimals);
}

export function money(value: string): bigint {
  return parseFixed(value, 4);
}

export function holdingValue(quantity: string, averagePrice: string): bigint {
  return (parseFixed(quantity, 8) * money(averagePrice)) / 100_000_000n;
}

export function formatFixed(value: bigint, scale: number): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const factor = 10n ** BigInt(scale);
  return `${sign}${absolute / factor}.${(absolute % factor).toString().padStart(scale, '0')}`;
}

export function formatMoney(value: bigint): string {
  return formatFixed(value, 4);
}

export function allocationWeight(amount: bigint, total: bigint): string {
  if (total === 0n) return '0.00000000';
  return formatFixed((amount * 100_000_000n) / total, 8);
}
