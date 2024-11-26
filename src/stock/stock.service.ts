import { HttpService } from '@nestjs/axios';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

import { FinnhubQuoteResponse } from './interfaces/finnhub-quote-response.interface';
import { StockPrice } from './models/stock-price.class';
import { PrismaService } from '../prisma/prisma.service';
import { GetStockDataResponseInterface } from './interfaces/get-stock-data-response.interface';

@Injectable()
export class StockService {
  private readonly finnhubKey: string;
  private readonly finnhubUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.finnhubKey = this.configService.get<string>('FINNHUB_KEY');
    this.finnhubUrl = this.configService.get<string>('FINNHUB_URL');
  }

  async getStockPrice(symbol: string): Promise<StockPrice> {
    const url = `${this.finnhubUrl}/quote?symbol=${symbol}&token=${this.finnhubKey}`;

    try {
      const response = await lastValueFrom(
        this.httpService.get<FinnhubQuoteResponse>(url),
      );
      const data = response.data;

      if (data && data.c !== undefined) {
        return new StockPrice(data);
      } else {
        throw new HttpException(
          'Invalid data from Finnhub API',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(
        'Error retrieving stock price',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async activateSymbol(symbolCode: string): Promise<void> {
    try {
      const existingSymbol = await this.prisma.symbol.findUnique({
        where: { code: symbolCode },
      });

      if (existingSymbol) {
        await this.prisma.symbol.update({
          where: { code: symbolCode },
          data: { isActive: true },
        });
      } else {
        await this.prisma.symbol.create({
          data: {
            code: symbolCode,
            isActive: true,
          },
        });
      }
    } catch (error) {
      throw new HttpException(
        'Error activating symbol',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getMovingAverage(symbol: string): Promise<number> {
    try {
      const existingSymbol = await this.prisma.symbol.findUnique({
        where: { code: symbol },
      });

      if (!existingSymbol) {
        throw new HttpException(
          `Symbol '${symbol}' not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const result = await this.prisma.$queryRaw<
        { avgPrice: number }[]
      >`
      SELECT AVG("price") AS "avgPrice"
      FROM (
        SELECT "price"
        FROM "StockPrice"
        WHERE "symbolId" = ${existingSymbol.id}
        ORDER BY "timestamp" DESC
        LIMIT 10
      ) AS sub;
    `;

      if (result.length === 0 || result[0].avgPrice === null) {
        throw new HttpException(
          `No price data available for symbol '${symbol}'`,
          HttpStatus.NOT_FOUND,
        );
      }

      return result[0].avgPrice;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Error calculating moving average',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async getStockData(symbol: string): Promise<GetStockDataResponseInterface> {
    try {
      const currentPriceData = await this.getStockPrice(symbol);

      const movingAverage = await this.getMovingAverage(symbol);

      const existingSymbol = await this.prisma.symbol.findUnique({
        where: { code: symbol },
      });

      if (!existingSymbol) {
        throw new HttpException(
          `Symbol '${symbol}' not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const lastPrice = await this.prisma.stockPrice.findFirst({
        where: { symbolId: existingSymbol.id },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastPrice) {
        throw new HttpException(
          `No price data available for symbol '${symbol}'`,
          HttpStatus.NOT_FOUND,
        );
      }

      const lastUpdate = lastPrice.timestamp;

      return {
        currentPrice: currentPriceData.currentPrice,
        lastUpdate,
        movingAverage,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Error retrieving stock data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
