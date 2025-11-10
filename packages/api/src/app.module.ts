/**
 * Root application module
 */
import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { CommonModule } from './common/common.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { RMF3Module } from './rmf3/rmf3.module';
import { RMFPPModule } from './rmfpp/rmfpp.module';
import { MetricsModule } from './metrics/metrics.module';
import { HMAIModule } from './hmai/hmai.module';
import { HMREModule } from './hmre/hmre.module';
import { DCOLModule } from './dcol/dcol.module';

// Check if Redis/BullMQ should be disabled
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';

@Module({
  imports: [
    // Global logger
    LoggerModule,

    // Configuration management
    ConfigModule.forRoot(),

    // Common utilities (Memory service, FTP client, etc.)
    CommonModule,

    // BullMQ queues for background jobs (optional - requires Redis)
    ...(DISABLE_REDIS ? [] : [QueueModule]),

    // Health checks
    HealthModule,

    // Authentication
    AuthModule,

    // RMF Monitor III
    RMF3Module,

    // RMF Post Processor
    RMFPPModule,

    // Prometheus metrics
    MetricsModule,

    // Data Ingestion Modules (HMAI requires Redis, others don't)
    ...(DISABLE_REDIS ? [] : [HMAIModule]),
    HMREModule,
    DCOLModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

