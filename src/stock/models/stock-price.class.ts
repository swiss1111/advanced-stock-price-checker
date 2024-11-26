import { ApiProperty } from '@nestjs/swagger';

import { FinnhubQuoteResponse } from '../interfaces/finnhub-quote-response.interface';

/**
 * Class for the stock price data.
 */
export class StockPrice {
  @ApiProperty({
    description: 'Current price',
    example: 234.795,
  })
  currentPrice: number;

  @ApiProperty({
    description: 'Change (Change compared to the previous closing price)',
    example: 1.925,
  })
  change: number;

  @ApiProperty({
    description: 'Change in percentage compared to the previous closing price',
    example: 0.8266,
  })
  percentChange: number;

  @ApiProperty({
    description: 'Highest price of the day',
    example: 235.57,
  })
  highPrice: number;

  @ApiProperty({
    description: 'Lowest price of the day',
    example: 232.9,
  })
  lowPrice: number;

  @ApiProperty({
    description: 'Opening price of the day',
    example: 232.9,
  })
  openPrice: number;

  @ApiProperty({
    description: 'Previous closing price',
    example: 232.87,
  })
  previousClosePrice: number;

  @ApiProperty({
    description: 'Timestamp in seconds',
    example: 1732640657,
  })
  timestamp: number;

  /**
   * onstructor that receives the Finnhub API response and populates the data members of the class.
   * @param finnhubData Finnhub API 'Quote' endpoint response
   */
  constructor(finnhubData: FinnhubQuoteResponse) {
    this.currentPrice = finnhubData.c;
    this.change = finnhubData.d;
    this.percentChange = finnhubData.dp;
    this.highPrice = finnhubData.h;
    this.lowPrice = finnhubData.l;
    this.openPrice = finnhubData.o;
    this.previousClosePrice = finnhubData.pc;
    this.timestamp = finnhubData.t;
  }
}
