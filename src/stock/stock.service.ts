import { HttpService } from '@nestjs/axios';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

import { FinnhubQuoteResponse } from './interfaces/finnhub-quote-response.interface';
import { StockPrice } from './models/stock-price.class';
import { PrismaService } from '../prisma/prisma.service';

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
}
