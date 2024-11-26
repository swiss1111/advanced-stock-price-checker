import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { StockController } from './stock.controller';
import { StockCron } from './stock.cron';
import { StockService } from './stock.service';

@Module({
  imports: [HttpModule, ConfigModule, ScheduleModule.forRoot()],
  providers: [StockService, StockCron],
  controllers: [StockController]
})
export class StockModule {}
