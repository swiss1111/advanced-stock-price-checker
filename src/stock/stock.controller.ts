import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { StockPrice } from './models/stock-price.class';
import { StockService } from './stock.service';

@Controller('stock')
@ApiTags('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':symbol')
  @ApiOperation({ summary: 'Get the current stock price' })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g. AAPL for Apple)',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'The current stock price and other data',
    type: StockPrice,
  })
  @ApiResponse({ status: 400, description: 'Invalid data from Finnhub API' })
  @ApiResponse({ status: 500, description: 'Error retrieving stock price' })
  async getStockPrice(@Param('symbol') symbol: string): Promise<StockPrice> {
    return await this.stockService.getStockPrice(symbol);
  }
}
