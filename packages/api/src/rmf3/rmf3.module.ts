/**
 * RMF Monitor III Module
 * Handles real-time mainframe metrics from RMF Monitor III
 */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RMF3Controller } from './rmf3.controller';
import { RMF3Service } from './rmf3.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 second timeout for DDS requests
      maxRedirects: 5,
    }),
  ],
  controllers: [RMF3Controller],
  providers: [RMF3Service],
  exports: [RMF3Service],
})
export class RMF3Module {}


