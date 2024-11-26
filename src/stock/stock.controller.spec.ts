import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { GetStockDataResponseInterface } from './interfaces/get-stock-data-response.interface';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

describe('StockController', () => {
  let stockController: StockController;
  let stockService: StockService;

  beforeEach(async () => {
    const mockStockService = {
      getStockData: jest.fn(),
      activateSymbol: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: mockStockService,
        },
      ],
    }).compile();

    stockController = moduleRef.get<StockController>(StockController);
    stockService = moduleRef.get<StockService>(StockService);
  });

  describe('getStockData', () => {
    it('should return stock data successfully', async () => {
      const symbol = 'AAPL';
      const mockResponse: GetStockDataResponseInterface = {
        currentPrice: 150.73,
        lastUpdate: new Date('2023-11-26T15:30:00Z'),
        movingAverage: 149.85,
      };

      jest.spyOn(stockService, 'getStockData').mockResolvedValue(mockResponse);

      const result = await stockController.getStockData(symbol);

      expect(stockService.getStockData).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException when symbol is not found', async () => {
      const symbol = 'INVALID';
      const errorMessage = `Symbol '${symbol}' not found`;
      const httpException = new HttpException(errorMessage, HttpStatus.NOT_FOUND);

      jest.spyOn(stockService, 'getStockData').mockRejectedValue(httpException);

      await expect(stockController.getStockData(symbol)).rejects.toThrowError(httpException);
      expect(stockService.getStockData).toHaveBeenCalledWith(symbol);
    });
  });

  describe('activateSymbol', () => {
    it('should activate symbol successfully', async () => {
      const symbol = 'AAPL';
      const expectedResponse = { message: `Symbol '${symbol}' activated successfully` };

      jest.spyOn(stockService, 'activateSymbol').mockResolvedValue(undefined);

      const result = await stockController.activateSymbol(symbol);

      expect(stockService.activateSymbol).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw HttpException when activation fails', async () => {
      const symbol = 'INVALID';
      const errorMessage = 'Error activating symbol';
      const httpException = new HttpException(errorMessage, HttpStatus.BAD_REQUEST);

      jest.spyOn(stockService, 'activateSymbol').mockRejectedValue(httpException);

      await expect(stockController.activateSymbol(symbol)).rejects.toThrowError(httpException);
      expect(stockService.activateSymbol).toHaveBeenCalledWith(symbol);
    });
  });
});
