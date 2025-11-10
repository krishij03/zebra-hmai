/**
 * RMF Post Processor Module
 * Handles historical mainframe metrics from RMF Post Processor
 */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RMFPPController } from './rmfpp.controller';
import { RMFPPService } from './rmfpp.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60 second timeout for PP reports (larger than RMF3)
      maxRedirects: 5,
    }),
  ],
  controllers: [RMFPPController],
  providers: [RMFPPService],
  exports: [RMFPPService],
})
export class RMFPPModule {}


