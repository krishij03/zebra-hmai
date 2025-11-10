/**
 * HMRE (Health Monitoring and Reporting Enhancements) Module
 * Handles enhanced reporting with FTP ingestion and MySQL storage
 */
import { Module } from '@nestjs/common';
import { HMREController } from './hmre.controller';
import { HMREService } from './hmre.service';

@Module({
  controllers: [HMREController],
  providers: [HMREService],
  exports: [HMREService],
})
export class HMREModule {}


