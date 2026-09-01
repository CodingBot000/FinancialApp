export const MARKET_PRICE_PORT = Symbol('MARKET_PRICE_PORT');

export interface MarketPricePort {
  price(instrumentCode: string): Promise<string>;
}
