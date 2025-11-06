/**
 * HMAI (Health Monitoring and Analytics Infrastructure) Module
 * Handles storage subsystem analytics with FTP ingestion and MySQL storage
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HMAIController } from './hmai.controller';
import { HMAIService } from './hmai.service';
import { HMAIIngestionService } from './hmai-ingestion.service';
import { HMAIDatabaseService } from './hmai-database.service';
import { HMAIMetricsService } from './hmai-metrics.service';
import { HMAIProcessor } from './hmai.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'hmai-ingestion' }),
  ],
  controllers: [HMAIController],
  providers: [
    HMAIService,
    HMAIIngestionService,
    HMAIDatabaseService,
    HMAIMetricsService,
    HMAIProcessor,
  ],
  exports: [HMAIService, HMAIIngestionService],
})
export class HMAIModule {}

