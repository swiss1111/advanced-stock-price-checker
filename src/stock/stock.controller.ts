import { Controller, Get, Put, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { GetStockDataResponseInterface } from './interfaces/get-stock-data-response.interface';
import { StockService } from './stock.service';

@Controller('stock')
@ApiTags('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':symbol')
  @ApiOperation({ summary: 'Get current stock price, last update time, and moving average' })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol (e.g. AAPL for Apple)',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'Current stock price, last update time, and moving average',
    schema: {
      type: 'object',
      properties: {
        currentPrice: { type: 'number', example: 150.73 },
        lastUpdate: { type: 'string', format: 'date-time', example: '2023-11-26T15:30:00Z' },
        movingAverage: { type: 'number', example: 149.85 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Symbol not found or no data available' })
  @ApiResponse({ status: 500, description: 'Error retrieving stock data' })
  async getStockData(@Param('symbol') symbol: string): Promise<GetStockDataResponseInterface> {
    return await this.stockService.getStockData(symbol);
  }

  @Put(':symbol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate symbol for cron job' })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol to activate (e.g. AAPL for Apple)',
    example: 'AAPL',
  })
  @ApiResponse({ status: 200, description: 'Symbol activated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid symbol or error activating symbol' })
  async activateSymbol(@Param('symbol') symbol: string): Promise<{ message: string }> {
    await this.stockService.activateSymbol(symbol);
    return { message: `Symbol '${symbol}' activated successfully` };
  }
}
