import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { CronJob } from 'cron';

import { StockCron } from './stock.cron';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';

jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation((cronTime, onTick) => ({
    cronTime,
    onTick,
    start: jest.fn(),
  })),
}));

describe('StockCron', () => {
  let stockCron: StockCron;
  let stockService: StockService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let schedulerRegistry: SchedulerRegistry;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StockCron,
        {
          provide: StockService,
          useValue: {
            getStockPrice: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            symbol: {
              findMany: jest.fn(),
            },
            stockPrice: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: jest.fn(),
          },
        },
      ],
    }).compile();

    stockCron = moduleRef.get<StockCron>(StockCron);
    stockService = moduleRef.get<StockService>(StockService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    configService = moduleRef.get<ConfigService>(ConfigService);
    schedulerRegistry = moduleRef.get<SchedulerRegistry>(SchedulerRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addCronJob', () => {
    it('should set up the cron job with the correct expression', () => {
      const cronExpression = '*/5 * * * * *';
      (configService.get as jest.Mock).mockReturnValue(cronExpression);

      // Re-instantiate to trigger the constructor again
      stockCron = new StockCron(
        stockService,
        prismaService,
        configService,
        schedulerRegistry,
      );

      expect(configService.get).toHaveBeenCalledWith('CRON_EXPRESSION');
      expect(CronJob).toHaveBeenCalledWith(
        cronExpression,
        expect.any(Function),
      );
    });
  });

  describe('handleCron', () => {
    it('should log a message when there are no active symbols', async () => {
      (prismaService.symbol.findMany as jest.Mock).mockResolvedValue([]);

      await stockCron.handleCron();

      expect(prismaService.symbol.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'There is no active symbol',
      );
    });

    it('should process active symbols and save prices', async () => {
      const activeSymbols = [
        { id: 1, code: 'AAPL', isActive: true },
        { id: 2, code: 'GOOGL', isActive: true },
      ];

      (prismaService.symbol.findMany as jest.Mock).mockResolvedValue(
        activeSymbols,
      );

      (stockService.getStockPrice as jest.Mock).mockImplementation(
        async () => {
          return {
            currentPrice: 150.0,
            timestamp: Date.now() / 1000,
          };
        },
      );

      await stockCron.handleCron();

      expect(prismaService.symbol.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });

      for (const symbol of activeSymbols) {
        expect(stockService.getStockPrice).toHaveBeenCalledWith(symbol.code);
        expect(prismaService.stockPrice.create).toHaveBeenCalledWith({
          data: {
            symbolId: symbol.id,
            price: 150.0,
            timestamp: expect.any(Date),
          },
        });
        expect(Logger.prototype.debug).toHaveBeenCalledWith(
          `Price saved: ${symbol.code} - 150`,
        );
      }
    });

    it('should handle errors when retrieving price', async () => {
      const activeSymbols = [{ id: 1, code: 'AAPL', isActive: true }];

      (prismaService.symbol.findMany as jest.Mock).mockResolvedValue(
        activeSymbols,
      );

      const errorMessage = 'API Error';
      (stockService.getStockPrice as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      await stockCron.handleCron();

      expect(stockService.getStockPrice).toHaveBeenCalledWith('AAPL');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error retrieving price: AAPL',
        errorMessage,
      );
    });
  });
});
