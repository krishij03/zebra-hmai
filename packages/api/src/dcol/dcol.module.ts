/**
 * DCOL (Data Collection) Module
 * Handles data collection metrics with FTP ingestion and MySQL storage
 */
import { Module } from '@nestjs/common';
import { DCOLController } from './dcol.controller';
import { DCOLService } from './dcol.service';

@Module({
  controllers: [DCOLController],
  providers: [DCOLService],
  exports: [DCOLService],
})
export class DCOLModule {}


