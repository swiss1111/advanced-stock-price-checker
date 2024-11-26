/**
 * Interface for the /stock/:symbol endpoint response.
 */
export interface GetStockDataResponseInterface {
  /** Current price */
  'currentPrice': number,

  /** Last update (Example: 2024-11-26T21:00:00.000Z) */
  'lastUpdate': Date,

  /** Moving average for the symbol*/
  'movingAverage': number
}
