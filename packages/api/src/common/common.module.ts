/**
 * Common Module
 * Provides shared services used across multiple modules
 */
import { Global, Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { FtpClientService } from './ftp-client.service';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [MemoryService, FtpClientService],
  exports: [MemoryService, FtpClientService],
})
export class CommonModule {}

