export class MarketStockNotFoundError extends Error {}

export class MarketProviderUnavailableError extends Error {
  readonly retryable = true;
}

export class MarketRateLimitedError extends Error {
  readonly retryable = true;
}

export class MarketDataInvalidError extends Error {}
