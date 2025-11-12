/**
 * HMAI Ingestion Service
 * Handles FTP monitoring and data ingestion using BullMQ
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job as BullJob } from 'bullmq';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { HMAIMetric, HMAI_METRICS } from './hmai-tables';
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

  /**
   * Clear database and memory for an LPAR
   */
  async clearDatabase(lpar: string): Promise<{ success: boolean; message: string }> {
    try {
      const lparConfig = this.config.getLparConfig(lpar);
      if (!lparConfig || !lparConfig.hmai) {
        throw new BadRequestException(`HMAI not configured for LPAR '${lpar}'`);
      }

      // Import services here to avoid circular dependency
      const { MemoryService } = await import('../common/memory.service');
      const { HMAIDatabaseService } = await import('./hmai-database.service');
      
      const memoryService = new MemoryService(this.logger);
      const dbService = new HMAIDatabaseService(this.logger, this.config);

      // Connect to MySQL
      const connection = await dbService.createConnection(lpar);
      
      // Ensure database exists
      await dbService.ensureDatabase(connection, lpar);

      // Truncate all tables
      const metrics: HMAIMetric[] = ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'];
      
      for (const metric of metrics) {
        try {
          await connection.query(`TRUNCATE TABLE ${metric}`);
          this.logger.log(`Truncated table ${metric}`, 'HMAIIngestionService');
        } catch (error) {
          // Table might not exist, continue
          this.logger.warn(`Failed to truncate ${metric}: ${error.message}`, 'HMAIIngestionService');
        }
      }

      // Clear memory
      await memoryService.clearLparData('hmai', lpar);

      // Stop any running processes
      await this.stopIngestion(lpar);

      // Close connection
      await dbService.closeConnection(connection);

      return {
        success: true,
        message: `All data cleared for ${lpar}`,
      };
    } catch (error) {
      this.logger.error(`Failed to clear database for ${lpar}: ${error.message}`, error.stack, 'HMAIIngestionService');
      throw error;
    }
  }

  /**
   * Start HMAI ingestion for all configured LPARs
   */
  async startAllLpars(): Promise<{
    success: boolean;
    message: string;
    startedLpars: string[];
    skippedLpars: string[];
    alreadyRunningLpars: string[];
  }> {
    const startedLpars: string[] = [];
    const skippedLpars: string[] = [];
    const alreadyRunningLpars: string[] = [];

    const allMetrics: HMAIMetric[] = ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'];
    
    // Get all LPARs
    const lpars = this.config.getLpars();

    // Check active jobs
    const activeJobs = await this.hmaiQueue.getActive();
    const activeLpars = activeJobs.map((job) => job.data.lpar);

    for (const lpar of lpars) {
      try {
        // Check if already running
        if (activeLpars.includes(lpar)) {
          alreadyRunningLpars.push(lpar);
          continue;
        }

        const lparConfig = this.config.getLparConfig(lpar);
        
        // Check if HMAI is properly configured
        if (!this.isLparConfiguredForHMAI(lparConfig)) {
          skippedLpars.push(lpar);
          continue;
        }

        // Start ingestion with continuous monitoring
        const hmaiConfig = lparConfig.hmai!;
        await this.startIngestion({
          lpar,
          metrics: allMetrics,
          startDate: hmaiConfig.defaultStartDate || new Date().toISOString().split('T')[0],
          continuousMonitoring: true,
          force: false,
        });

        startedLpars.push(lpar);
        this.logger.log(`Started HMAI for ${lpar}`, 'HMAIIngestionService');
      } catch (error) {
        this.logger.error(`Failed to start HMAI for ${lpar}: ${error.message}`, error.stack, 'HMAIIngestionService');
        skippedLpars.push(lpar);
      }
    }

    return {
      success: true,
      message: 'HMAI process started for configured LPARs',
      startedLpars,
      skippedLpars,
      alreadyRunningLpars,
    };
  }

  /**
   * Get running processes for all LPARs
   */
  async getRunningProcesses(): Promise<Record<string, { isRunning: boolean; continuousMonitoring: boolean }>> {
    const result: Record<string, { isRunning: boolean; continuousMonitoring: boolean }> = {};

    // Get all active and waiting jobs
    const jobs = await this.hmaiQueue.getJobs(['active', 'waiting', 'delayed']);
    
    // Get repeatable jobs
    const repeatableJobs = await this.hmaiQueue.getRepeatableJobs();
    const continuousLpars = new Set(
      repeatableJobs
        .map((job) => job.id?.replace('hmai-continuous-', ''))
        .filter(Boolean)
    );

    // Build result map
    for (const job of jobs) {
      const lpar = job.data.lpar;
      result[lpar] = {
        isRunning: true,
        continuousMonitoring: continuousLpars.has(lpar),
      };
    }

    return result;
  }

  /**
   * Check if requested data has already been processed
   */
  async checkProcessedData(
    lpar: string,
    startDate: string,
    endDate?: string,
    metrics?: string[],
  ): Promise<{
    alreadyProcessed: boolean;
    processedDirs: string[];
    processedMetrics: Record<string, string[]>;
    warning: string;
  }> {
    // Get LPAR config
    const lparConfig = this.config.getLparConfig(lpar);
    if (!lparConfig) {
      throw new BadRequestException(`LPAR ${lpar} not found in configuration`);
    }

    const hmaiConfig = lparConfig.hmai;
    if (!hmaiConfig) {
      throw new BadRequestException(`LPAR ${lpar} is not configured for HMAI`);
    }

    // Read memory file
    const { MemoryService } = await import('../common/memory.service');
    const memoryService = new MemoryService(this.logger);
    const memory = await memoryService.readLparData('hmai', lpar);

    // Generate directory names for date range
    const dirsToCheck: string[] = [];
    if (startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dirsToCheck.push(`${year}${month}${day}`);
      }
    }

    // Check which directories have been processed
    const processedDirs = dirsToCheck.filter((dir) => 
      memory.processedDirectories?.includes(dir)
    );

    // Check which metrics have been processed for these dates
    const processedMetrics: Record<string, string[]> = {};
    const requestedMetrics = metrics || HMAI_METRICS;

    for (const dir of processedDirs) {
      const dirProcessedMetrics = memory.processedMetrics?.[dir] || [];
      const matchingMetrics = requestedMetrics.filter((m) =>
        dirProcessedMetrics.includes(m)
      );
      if (matchingMetrics.length > 0) {
        processedMetrics[dir] = matchingMetrics;
      }
    }

    const alreadyProcessed = processedDirs.length > 0;
    
    let warning = '';
    if (alreadyProcessed) {
      const allMetrics = Object.values(processedMetrics).flat();
      const uniqueMetrics = [...new Set(allMetrics)];
      warning = `Warning: Some or all of this data has already been processed.\n` +
        `Processed dates: ${processedDirs.join(', ')}\n` +
        `Processed metrics: ${uniqueMetrics.join(', ')}\n\n` +
        `If you continue, you may create duplicate records in the database.`;
    }

    return {
      alreadyProcessed,
      processedDirs,
      processedMetrics,
      warning,
    };
  }

  /**
   * Check if LPAR is properly configured for HMAI
   */
  private isLparConfiguredForHMAI(lparConfig: any): boolean {
    return (
      lparConfig &&
      lparConfig.hmai &&
      lparConfig.hmai.ftp &&
      lparConfig.hmai.ftp.directory &&
      lparConfig.hmai.mysql &&
      lparConfig.hmai.mysql.host &&
      lparConfig.hmai.mysql.user &&
      lparConfig.hmai.mysql.password &&
      lparConfig.hmai.checkInterval &&
      lparConfig.hmai.defaultStartDate &&
      lparConfig.hmai.continuousMonitoring === true
    );
  }
}

