import { describe, expect, it } from 'vitest';

import {
  formatCompactWon,
  formatQuantity,
  formatWon,
  isMaskedAccountIdentifier,
} from './finance-format';

describe('wealth contract formatters', () => {
  it('maps canonical decimal strings without floating-point display artifacts', () => {
    expect(formatWon('185400000.0000')).toBe('185,400,000원');
    expect(formatCompactWon('185400000.0000')).toBe('18,540만원');
    expect(formatQuantity('1360.00000000')).toBe('1,360');
    expect(formatQuantity('0.12345678')).toBe('0.12345678');
  });

  it('fails closed for invalid decimals and unmasked identifiers', () => {
    expect(formatWon('NaN')).toBe('금액 확인 필요');
    expect(formatQuantity('Infinity')).toBe('수량 확인 필요');
    expect(isMaskedAccountIdentifier('***-**-0001')).toBe(true);
    expect(isMaskedAccountIdentifier('1234567890')).toBe(false);
  });
});
