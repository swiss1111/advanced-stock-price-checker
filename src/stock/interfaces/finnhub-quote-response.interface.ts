/**
 * Interface for the Finnhub API 'Quote' endpoint response.
 */
export interface FinnhubQuoteResponse {
  /** Current price */
  c: number;

  /** Change (Change compared to the previous closing price) */
  d: number;

  /** Percent change (Change in percentage) */
  dp: number;

  /** High price of the day */
  h: number;

  /** Low price of the day */
  l: number;

  /** Open price of the day */
  o: number;

  /** Previous close price */
  pc: number;

  /** Timestamp (Timestamp in seconds) */
  t: number;
}
