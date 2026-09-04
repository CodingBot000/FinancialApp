import { describe, expect, it } from 'vitest';

import {
  formatFundPurchaseAmountInput,
  fundOrderQuantityFromAmount,
  fundReferenceUnitPrice,
  fundUnitsFromOrderQuantity,
  normalizeFundPurchaseAmountInput,
  validateFundPurchaseAmount,
} from './fund-order';

describe('fund order amount adapter', () => {
  it('keeps canonical digits in state and adds separators only for display', () => {
    expect(normalizeFundPurchaseAmountInput('1,000,000원')).toBe('1000000');
    expect(normalizeFundPurchaseAmountInput('000500000')).toBe('500000');
    expect(formatFundPurchaseAmountInput('1000000')).toBe('1,000,000');
    expect(formatFundPurchaseAmountInput('')).toBe('');
  });

  it('derives the existing eight-decimal quantity without floating point math', () => {
    expect(fundReferenceUnitPrice('170000000.0000', '1360.00000000')).toBe(
      '125000.0000',
    );
    expect(fundOrderQuantityFromAmount('1000000', '125000.0000')).toBe(
      '8.00000000',
    );
    expect(fundOrderQuantityFromAmount('100000', '125000.0000')).toBe(
      '0.80000000',
    );
    expect(fundOrderQuantityFromAmount('10000', '3333.3333')).toBe(
      '3.00000003',
    );
    expect(fundUnitsFromOrderQuantity('8.00000000')).toBe('8000.00000000');
    expect(fundUnitsFromOrderQuantity('0.80000000')).toBe('800.00000000');
  });

  it('rejects invalid or below-minimum purchase amounts', () => {
    expect(validateFundPurchaseAmount('')).toBe(
      '매수금액을 원 단위 숫자로 입력해 주세요.',
    );
    expect(validateFundPurchaseAmount('9999')).toBe(
      '매수금액은 10,000원 이상이어야 해요.',
    );
    expect(fundOrderQuantityFromAmount('9999', '125000.0000')).toBeUndefined();
    expect(fundOrderQuantityFromAmount('10000', '0.0000')).toBeUndefined();
    expect(fundUnitsFromOrderQuantity('invalid')).toBeUndefined();
  });
});
