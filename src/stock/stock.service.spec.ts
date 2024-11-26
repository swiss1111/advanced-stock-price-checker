import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosRequestHeaders, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinnhubQuoteResponse } from './interfaces/finnhub-quote-response.interface';
import { StockPrice } from './models/stock-price.class';


describe('StockService', () => {
  let stockService: StockService;
  let httpService: HttpService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'FINNHUB_KEY') return 'test-key';
        if (key === 'FINNHUB_URL') return 'https://finnhub.io/api/v1';
        return null;
      }),
    };

    const mockPrismaService = {
      symbol: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockPrice: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    stockService = moduleRef.get<StockService>(StockService);
    httpService = moduleRef.get<HttpService>(HttpService);
    configService = moduleRef.get<ConfigService>(ConfigService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);

    // Set up default config values
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'FINNHUB_KEY') return 'test-key';
      if (key === 'FINNHUB_URL') return 'https://finnhub.io/api/v1';
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockPrice', () => {
    it('should return stock price successfully', async () => {
      const symbol = 'AAPL';
      const apiResponse: AxiosResponse<FinnhubQuoteResponse> = {
        data: {
          c: 150.0,
          h: 151.0,
          l: 149.0,
          o: 150.5,
          pc: 149.5,
          t: 1638326400,
        } as FinnhubQuoteResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as AxiosRequestHeaders
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(apiResponse));

      const result = await stockService.getStockPrice(symbol);

      expect(httpService.get).toHaveBeenCalledWith(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=test-key`,
      );
      expect(result).toBeInstanceOf(StockPrice);
      expect(result.currentPrice).toEqual(150.0);
    });

    it('should throw HttpException when API returns invalid data', async () => {
      const symbol = 'AAPL';
      const apiResponse: AxiosResponse<FinnhubQuoteResponse> = {
        data: {
          h: 151.0,
          l: 149.0,
          o: 150.5,
          pc: 149.5,
          // Missing required fields like `c` and `t`
        } as FinnhubQuoteResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as AxiosRequestHeaders,
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(apiResponse));

      await expect(stockService.getStockPrice(symbol)).rejects.toThrowError(
        new HttpException('Invalid data from Finnhub API', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw HttpException when API call fails', async () => {
      const symbol = 'AAPL';
      const error = {
        response: {
          status: 500,
        },
      };

      (httpService.get as jest.Mock).mockReturnValue(throwError(() => error));

      await expect(stockService.getStockPrice(symbol)).rejects.toThrowError(
        new HttpException('Error retrieving stock price', 500),
      );
    });
  });

  describe('activateSymbol', () => {
    it('should activate existing symbol', async () => {
      const symbolCode = 'AAPL';
      const existingSymbol = { id: 1, code: symbolCode, isActive: false };

      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(
        existingSymbol,
      );
      (prismaService.symbol.update as jest.Mock).mockResolvedValue({
        ...existingSymbol,
        isActive: true,
      });

      await stockService.activateSymbol(symbolCode);

      expect(prismaService.symbol.findUnique).toHaveBeenCalledWith({
        where: { code: symbolCode },
      });
      expect(prismaService.symbol.update).toHaveBeenCalledWith({
        where: { code: symbolCode },
        data: { isActive: true },
      });
    });

    it('should create and activate new symbol if it does not exist', async () => {
      const symbolCode = 'AAPL';

      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.symbol.create as jest.Mock).mockResolvedValue({
        id: 1,
        code: symbolCode,
        isActive: true,
      });

      await stockService.activateSymbol(symbolCode);

      expect(prismaService.symbol.findUnique).toHaveBeenCalledWith({
        where: { code: symbolCode },
      });
      expect(prismaService.symbol.create).toHaveBeenCalledWith({
        data: {
          code: symbolCode,
          isActive: true,
        },
      });
    });

    it('should throw HttpException when activation fails', async () => {
      const symbolCode = 'AAPL';
      const error = new Error('Database error');

      (prismaService.symbol.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(stockService.activateSymbol(symbolCode)).rejects.toThrowError(
        new HttpException('Error activating symbol', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('getMovingAverage', () => {
    it('should return moving average successfully', async () => {
      const symbol = 'AAPL';
      const existingSymbol = { id: 1, code: symbol };
      const avgPrice = 150.0;

      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(
        existingSymbol,
      );
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { avgPrice },
      ]);

      const result = await stockService.getMovingAverage(symbol);

      expect(prismaService.symbol.findUnique).toHaveBeenCalledWith({
        where: { code: symbol },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual(avgPrice);
    });

    it('should throw HttpException when symbol not found', async () => {
      const symbol = 'INVALID';

      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(stockService.getMovingAverage(symbol)).rejects.toThrowError(
        new HttpException(`Symbol '${symbol}' not found`, HttpStatus.NOT_FOUND),
      );
    });

    it('should throw HttpException when no price data available', async () => {
      const symbol = 'AAPL';
      const existingSymbol = { id: 1, code: symbol };

      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(
        existingSymbol,
      );
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { avgPrice: null },
      ]);

      await expect(stockService.getMovingAverage(symbol)).rejects.toThrowError(
        new HttpException(
          `No price data available for symbol '${symbol}'`,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('getStockData', () => {
    it('should return stock data successfully', async () => {
      const symbol = 'AAPL';
      const currentPriceData = new StockPrice({
        c: 150.0,
        h: 151.0,
        l: 149.0,
        o: 150.5,
        pc: 149.5,
        t: 1638326400,
      } as FinnhubQuoteResponse);
      const movingAverage = 150.0;
      const existingSymbol = { id: 1, code: symbol };
      const lastPrice = {
        timestamp: new Date('2023-11-26T15:30:00Z'),
      };

      jest
        .spyOn(stockService, 'getStockPrice')
        .mockResolvedValue(currentPriceData);
      jest
        .spyOn(stockService, 'getMovingAverage')
        .mockResolvedValue(movingAverage);
      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(
        existingSymbol,
      );
      (prismaService.stockPrice.findFirst as jest.Mock).mockResolvedValue(
        lastPrice,
      );

      const result = await stockService.getStockData(symbol);

      expect(stockService.getStockPrice).toHaveBeenCalledWith(symbol);
      expect(stockService.getMovingAverage).toHaveBeenCalledWith(symbol);
      expect(prismaService.symbol.findUnique).toHaveBeenCalledWith({
        where: { code: symbol },
      });
      expect(prismaService.stockPrice.findFirst).toHaveBeenCalledWith({
        where: { symbolId: existingSymbol.id },
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual({
        currentPrice: currentPriceData.currentPrice,
        lastUpdate: lastPrice.timestamp,
        movingAverage,
      });
    });

    it('should throw HttpException when symbol not found', async () => {
      const symbol = 'INVALID';

      jest
        .spyOn(stockService, 'getStockPrice')
        .mockRejectedValue(
          new HttpException('Error retrieving stock price', HttpStatus.BAD_REQUEST),
        );

      await expect(stockService.getStockData(symbol)).rejects.toThrowError(
        new HttpException('Error retrieving stock price', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw HttpException when no price data available', async () => {
      const symbol = 'AAPL';
      const currentPriceData = new StockPrice({
        c: 150.0,
        h: 151.0,
        l: 149.0,
        o: 150.5,
        pc: 149.5,
        t: 1638326400,
      } as FinnhubQuoteResponse);
      const movingAverage = 150.0;
      const existingSymbol = { id: 1, code: symbol };

      jest
        .spyOn(stockService, 'getStockPrice')
        .mockResolvedValue(currentPriceData);
      jest
        .spyOn(stockService, 'getMovingAverage')
        .mockResolvedValue(movingAverage);
      (prismaService.symbol.findUnique as jest.Mock).mockResolvedValue(
        existingSymbol,
      );
      (prismaService.stockPrice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(stockService.getStockData(symbol)).rejects.toThrowError(
        new HttpException(
          `No price data available for symbol '${symbol}'`,
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
