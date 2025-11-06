/**
 * Metrics Module
 * Prometheus metrics collection and export
 */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}

