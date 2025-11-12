/**
 * Metrics Module
 * Prometheus metrics collection and export
 */
import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { RMF3Module } from '../rmf3/rmf3.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    forwardRef(() => RMF3Module), // Use forwardRef to avoid circular dependency
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}


