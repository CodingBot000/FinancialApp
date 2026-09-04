import { describe, expect, it } from 'vitest';

import {
  formatCompactWon,
  formatDate,
  formatDateTime,
  formatQuantity,
  formatWon,
  formatWonInput,
  isMaskedAccountIdentifier,
} from './finance-format';

describe('wealth contract formatters', () => {
  it('maps canonical decimal strings without floating-point display artifacts', () => {
    expect(formatWon('185400000.0000')).toBe('185,400,000원');
    expect(formatCompactWon('185400000.0000')).toBe('18,540만원');
    expect(formatWon('185400000.0000', true)).toBe('••••원');
    expect(formatCompactWon('185400000.0000', true)).toBe('••••만원');
    expect(formatQuantity('1360.00000000')).toBe('1,360');
    expect(formatQuantity('0.12345678')).toBe('0.12345678');
  });

  it('formats KRW input values without decimal padding', () => {
    expect(formatWonInput('185400000.0000')).toBe('185400000');
    expect(formatWonInput('1500000.5')).toBe('1500001');
    expect(formatWonInput('')).toBe('');
  });

  it('fails closed for invalid decimals and unmasked identifiers', () => {
    expect(formatWon('NaN')).toBe('금액 확인 필요');
    expect(formatQuantity('Infinity')).toBe('수량 확인 필요');
    expect(isMaskedAccountIdentifier('***-**-0001')).toBe(true);
    expect(isMaskedAccountIdentifier('1234567890')).toBe(false);
  });

  it('normalizes API timestamps for Korean UI display', () => {
    expect(formatDate('2026-09-01T00:00:00.000Z')).toBe('2026-09-01');
    expect(formatDate('2026-09-01')).toBe('2026-09-01');
    expect(formatDateTime('2026-09-01T00:00:00.000Z')).toBe('2026-09-01 09:00');
    expect(formatDate(null)).toBe('날짜 없음');
    expect(formatDateTime('not-a-date')).toBe('날짜 확인 필요');
  });
});
