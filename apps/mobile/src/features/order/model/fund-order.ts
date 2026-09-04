import { formatWon } from '../../../shared/format/finance-format';

const ORDER_QUANTITY_SCALE = 8;
const UNIT_PRICE_SCALE = 4;

export const FUND_ORDER_PRESET = {
  defaultPurchaseAmount: '1000000',
  minimumPurchaseAmount: '10000',
  pricingUnitSize: '1000',
} as const;

const WON_AMOUNT_PATTERN = /^(?:0|[1-9][0-9]*)$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)(?:\.([0-9]+))?$/;

export function normalizeFundPurchaseAmountInput(value: string): string {
  const digits = value.replaceAll(/[^0-9]/g, '');
  if (digits === '') return '';
  return digits.replace(/^0+(?=[0-9])/, '');
}

export function formatFundPurchaseAmountInput(value: string): string {
  if (!WON_AMOUNT_PATTERN.test(value)) return value;
  return value.replace(/\B(?=(?:[0-9]{3})+(?![0-9]))/g, ',');
}

function powerOfTen(scale: number): bigint {
  return 10n ** BigInt(scale);
}

function scaledDecimal(value: string, scale: number): bigint | undefined {
  const match = POSITIVE_DECIMAL_PATTERN.exec(value);
  if (!match) return undefined;
  const fraction = match[1] ?? '';
  if (fraction.length > scale) return undefined;
  const whole = value.split('.')[0] ?? '0';
  return (
    BigInt(whole) * powerOfTen(scale) +
    BigInt(fraction.padEnd(scale, '0') || '0')
  );
}

function fixedDecimal(value: bigint, scale: number): string {
  const divisor = powerOfTen(scale);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(scale, '0');
  return `${whole}.${fraction}`;
}

export function validateFundPurchaseAmount(
  purchaseAmount: string,
): string | undefined {
  if (!WON_AMOUNT_PATTERN.test(purchaseAmount)) {
    return '매수금액을 원 단위 숫자로 입력해 주세요.';
  }
  if (
    BigInt(purchaseAmount) < BigInt(FUND_ORDER_PRESET.minimumPurchaseAmount)
  ) {
    return `매수금액은 ${formatWon(FUND_ORDER_PRESET.minimumPurchaseAmount)} 이상이어야 해요.`;
  }
  return undefined;
}

export function fundReferenceUnitPrice(
  marketValue: string,
  holdingQuantity: string,
): string | undefined {
  const scaledMarketValue = scaledDecimal(marketValue, UNIT_PRICE_SCALE);
  const scaledHoldingQuantity = scaledDecimal(
    holdingQuantity,
    ORDER_QUANTITY_SCALE,
  );
  if (
    scaledMarketValue === undefined ||
    scaledMarketValue <= 0n ||
    scaledHoldingQuantity === undefined ||
    scaledHoldingQuantity <= 0n
  ) {
    return undefined;
  }
  return fixedDecimal(
    (scaledMarketValue * powerOfTen(ORDER_QUANTITY_SCALE)) /
      scaledHoldingQuantity,
    UNIT_PRICE_SCALE,
  );
}

/** Converts an amount-first fund order into the existing quantity contract. */
export function fundOrderQuantityFromAmount(
  purchaseAmount: string,
  unitPrice: string,
): string | undefined {
  if (validateFundPurchaseAmount(purchaseAmount)) return undefined;
  const scaledPrice = scaledDecimal(unitPrice, UNIT_PRICE_SCALE);
  if (scaledPrice === undefined || scaledPrice <= 0n) return undefined;

  const scaledQuantity =
    (BigInt(purchaseAmount) *
      powerOfTen(ORDER_QUANTITY_SCALE + UNIT_PRICE_SCALE)) /
    scaledPrice;
  if (scaledQuantity <= 0n) return undefined;
  return fixedDecimal(scaledQuantity, ORDER_QUANTITY_SCALE);
}

export function fundUnitsFromOrderQuantity(
  orderQuantity: string,
): string | undefined {
  const scaledQuantity = scaledDecimal(orderQuantity, ORDER_QUANTITY_SCALE);
  if (scaledQuantity === undefined || scaledQuantity < 0n) return undefined;
  return fixedDecimal(
    scaledQuantity * BigInt(FUND_ORDER_PRESET.pricingUnitSize),
    ORDER_QUANTITY_SCALE,
  );
}
