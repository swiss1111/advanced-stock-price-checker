import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockCron {
  private readonly logger = new Logger(StockCron.name);

  constructor(
    private readonly stockService: StockService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.addCronJob();
  }

  addCronJob() {
    const cronExpression = this.configService.get<string>('CRON_EXPRESSION') || '0 * * * * *';

    try {
      const job = new CronJob(cronExpression, async () => {
        await this.handleCron();
      });

      this.schedulerRegistry.addCronJob('stockPriceCronJob', job);
      job.start();
      this.logger.log(`Cron job set up with the following expression: ${cronExpression}`);
    } catch (error) {
      this.logger.error(`Invalid cron expression: ${cronExpression}`, error);
    }
  }

  async handleCron() {
    this.logger.debug('Cron job running: Get prices of active symbols');

    const activeSymbols = await this.prisma.symbol.findMany({
      where: { isActive: true },
    });

    if (activeSymbols.length === 0) {
      this.logger.debug('There is no active symbol');
      return;
    }

    for (const symbol of activeSymbols) {
      try {
        const stockPrice = await this.stockService.getStockPrice(symbol.code);

        await this.prisma.stockPrice.create({
          data: {
            symbolId: symbol.id,
            price: stockPrice.currentPrice,
            timestamp: new Date(stockPrice.timestamp * 1000),
          },
        });

        this.logger.debug(`Price saved: ${symbol.code} - ${stockPrice.currentPrice}`);
      } catch (error) {
        this.logger.error(
          `Error retrieving price: ${symbol.code}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
}
