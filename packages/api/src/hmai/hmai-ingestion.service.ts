/**
 * HMAI Ingestion Service
 * Handles FTP monitoring and data ingestion using BullMQ
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job as BullJob } from 'bullmq';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { HMAIMetric } from './hmai-tables';
import { HMAIIngestionJobData } from './hmai.processor';
import type {
  HMAIIngestionStatusRequestDTO,
  HMAIIngestionStatusResponseDTO,
  HMAIStartIngestionRequestDTO,
  HMAIStartIngestionResponseDTO,
} from '@zebra/shared/dtos';

@Injectable()
export class HMAIIngestionService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    @InjectQueue('hmai-ingestion') private hmaiQueue: Queue,
  ) {}

  /**
   * Get ingestion status for an LPAR
   */
  async getStatus(request: HMAIIngestionStatusRequestDTO): Promise<HMAIIngestionStatusResponseDTO> {
    // Get all jobs for this LPAR
    const jobs = await this.hmaiQueue.getJobs([
      'active',
      'waiting',
      'delayed',
      'paused',
    ]);

    const lparJobs = jobs.filter((job) => job.data.lpar === request.lpar);

    if (lparJobs.length === 0) {
      return {
        lpar: request.lpar,
        status: 'idle',
        statistics: {
          totalDirectories: 0,
          processedDirectories: 0,
          totalFiles: 0,
          processedFiles: 0,
          failedFiles: 0,
        },
      };
    }

    // Get the most recent job
    const job = lparJobs[0];
    const state = await job.getState();
    const progress = job.progress as number | undefined;

    return {
      lpar: request.lpar,
      status: state as any,
      lastCheck: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
      lastSuccessfulIngestion: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
      statistics: {
        totalDirectories: 0,
        processedDirectories: 0,
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
      },
      currentDirectory: undefined,
      estimatedCompletion: undefined,
    };
  }

  /**
   * Start ingestion for an LPAR
   */
  async startIngestion(request: HMAIStartIngestionRequestDTO): Promise<HMAIStartIngestionResponseDTO> {
    // Validate LPAR config
    const lparConfig = this.config.getLparConfig(request.lpar);
    if (!lparConfig || !lparConfig.hmai) {
      throw new BadRequestException(`HMAI not configured for LPAR '${request.lpar}'`);
    }

    // Check if already running (unless force is specified)
    if (!request.force) {
      const activeJobs = await this.hmaiQueue.getActive();
      const running = activeJobs.some((job) => job.data.lpar === request.lpar);
      
      if (running) {
        throw new BadRequestException(`Ingestion already running for LPAR '${request.lpar}'`);
      }
    }

    // Create job data
    const jobData: HMAIIngestionJobData = {
      lpar: request.lpar,
      metrics: request.metrics as HMAIMetric[],
      startDate: request.startDate,
      endDate: request.endDate || null,
      continuousMonitoring: request.continuousMonitoring || false,
    };

    // Add job to queue
    const job = await this.hmaiQueue.add('process-hmai', jobData, {
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 60000, // Start with 1 minute delay
      },
    });

    this.logger.log(
      `HMAI ingestion job ${job.id} queued for ${request.lpar}`,
      'HMAIIngestionService',
    );

    // If continuous monitoring, schedule recurring job
    if (request.continuousMonitoring) {
      const checkInterval = lparConfig.hmai.checkInterval || 30; // Default 30 minutes
      const intervalMs = checkInterval * 60 * 1000;

      await this.hmaiQueue.add('process-hmai', jobData, {
        repeat: {
          every: intervalMs,
        },
        jobId: `hmai-continuous-${request.lpar}`, // Use consistent ID for repeatability
      });

      this.logger.log(
        `Continuous monitoring enabled for ${request.lpar} (interval: ${checkInterval} minutes)`,
        'HMAIIngestionService',
      );
    }

    return {
      lpar: request.lpar,
      jobId: job.id?.toString() || '',
      status: 'started',
      message: request.continuousMonitoring
        ? `HMAI ingestion started with continuous monitoring (every ${lparConfig.hmai.checkInterval || 30} minutes)`
        : 'HMAI ingestion job queued successfully',
    };
  }

  /**
   * Stop ingestion for an LPAR
   */
  async stopIngestion(lpar: string): Promise<void> {
    // Remove all jobs for this LPAR
    const jobs = await this.hmaiQueue.getJobs(['active', 'waiting', 'delayed']);
    
    for (const job of jobs) {
      if (job.data.lpar === lpar) {
        await job.remove();
      }
    }

    // Remove repeatable job if it exists
    const repeatableJobs = await this.hmaiQueue.getRepeatableJobs();
    for (const repeatableJob of repeatableJobs) {
      if (repeatableJob.id === `hmai-continuous-${lpar}`) {
        await this.hmaiQueue.removeRepeatableByKey(repeatableJob.key);
      }
    }

    this.logger.log(`Stopped ingestion for ${lpar}`, 'HMAIIngestionService');
  }
}

