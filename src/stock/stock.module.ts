import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [StockService],
  controllers: [StockController]
})
export class StockModule {}
