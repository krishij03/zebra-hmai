/**
 * Queue Module
 * Configures BullMQ queues for background job processing
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    // Global BullMQ configuration
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        // Disable retries to avoid blocking Redis
        maxRetriesPerRequest: null,
        // Enable offline queue for connection resilience
        enableOfflineQueue: true,
      },
    }),
    
    // Register individual queues
    BullModule.registerQueue(
      { name: 'hmai-ingestion' },
      { name: 'hmre-ingestion' },
      { name: 'dcol-ingestion' },
      { name: 'data-retention' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

