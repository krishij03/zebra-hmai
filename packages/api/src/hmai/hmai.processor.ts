/**
 * HMAI Ingestion Processor
 * BullMQ worker that processes HMAI FTP ingestion jobs
 */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { MemoryService } from '../common/memory.service';
import { FtpClientService } from '../common/ftp-client.service';
import { HMAIDatabaseService } from './hmai-database.service';
import { HMAIMetricsService } from './hmai-metrics.service';
import {
  HMAIMetric,
  HMAI_METRICS,
  parseDirName,
  getMetricFromFileName,
} from './hmai-tables';
import { Client as FTPClient } from 'basic-ftp';
import { Connection } from 'mysql2/promise';
import { PassThrough } from 'stream';

export interface HMAIIngestionJobData {
  lpar: string;
  metrics: HMAIMetric[];
  startDate: string;
  endDate?: string | null;
  continuousMonitoring: boolean;
}

export interface HMAIIngestionResult {
  lpar: string;
  directoriesProcessed: number;
  filesProcessed: number;
  totalRows: number;
  errors: string[];
}

@Injectable()
@Processor('hmai-ingestion')
export class HMAIProcessor extends WorkerHost {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly memoryService: MemoryService,
    private readonly ftpClient: FtpClientService,
    private readonly dbService: HMAIDatabaseService,
    private readonly metricsService: HMAIMetricsService,
  ) {
    super();
  }

  /**
   * Main job processor
   */
  async process(job: Job<HMAIIngestionJobData, HMAIIngestionResult>): Promise<HMAIIngestionResult> {
    const { lpar, metrics, startDate, endDate, continuousMonitoring } = job.data;

    this.logger.log(
      `Processing HMAI ingestion job ${job.id} for ${lpar}`,
      'HMAIProcessor',
    );

    // Record job start
    const startTime = Date.now();
    this.metricsService.recordJobStart(lpar);

    let ftpConnection: FTPClient | null = null;
    let mysqlConnection: Connection | null = null;

    const result: HMAIIngestionResult = {
      lpar,
      directoriesProcessed: 0,
      filesProcessed: 0,
      totalRows: 0,
      errors: [],
    };

    try {
      // 1. Connect to MySQL
      mysqlConnection = await this.dbService.createConnection(lpar);
      
      // 2. Ensure database and tables exist
      await this.dbService.ensureDatabase(mysqlConnection, lpar);
      await this.dbService.createTables(mysqlConnection, metrics);

      // 3. Connect to FTP
      ftpConnection = await this.ftpClient.connect(lpar, 'hmai');

      // 4. Get FTP directory from config
      const lparConfig = this.config.getLparConfig(lpar);
      const ftpDirectory = lparConfig?.hmai?.ftp?.directory;

      if (!ftpDirectory) {
        throw new Error(`FTP directory not configured for LPAR '${lpar}'`);
      }

      // 5. Change to FTP directory
      await this.ftpClient.changeDirectory(ftpConnection, ftpDirectory);

      // 6. List all directories
      const allItems = await this.ftpClient.listFiles(ftpConnection, '.');
      const directories = allItems.filter((item) => item.isDirectory);

      this.logger.log(
        `Found ${directories.length} directories in ${ftpDirectory}`,
        'HMAIProcessor',
      );

      // 7. Filter directories by date range and memory
      const startDateTime = new Date(startDate);
      const endDateTime = endDate ? new Date(endDate) : new Date();

      const toProcess = [];

      for (const dir of directories) {
        const dirDate = parseDirName(dir.name);
        
        if (!dirDate) {
          continue; // Invalid directory name format
        }

        // Check date range
        if (dirDate < startDateTime || dirDate > endDateTime) {
          continue;
        }

        // Check memory - see if all metrics have been processed
        const memoryData = await this.memoryService.readLparData('hmai', lpar);
        const dirInfo = memoryData[dir.name];

        if (!dirInfo) {
          // Directory not processed at all
          toProcess.push(dir);
          continue;
        }

        const processedMetrics = dirInfo.processedMetrics || [];
        const needsProcessing = metrics.some(
          (metric) => !processedMetrics.includes(metric),
        );

        if (needsProcessing) {
          toProcess.push(dir);
        }
      }

      this.logger.log(
        `${toProcess.length} directories need processing`,
        'HMAIProcessor',
      );

      // 8. Process each directory
      for (let i = 0; i < toProcess.length; i++) {
        const dir = toProcess[i];
        
        try {
          const dirResult = await this.processDirectory(
            ftpConnection,
            mysqlConnection,
            ftpDirectory,
            dir.name,
            lpar,
            metrics,
          );

          result.directoriesProcessed++;
          result.filesProcessed += dirResult.filesProcessed;
          result.totalRows += dirResult.totalRows;

          // Record metrics for this directory
          for (const [metric, count] of Object.entries(dirResult.metricStats)) {
            if (count > 0) {
              this.metricsService.recordFilesProcessed(lpar, metric, 1);
              this.metricsService.recordRowsInserted(lpar, metric, count);
            }
          }

          // Update job progress
          await job.updateProgress(Math.round(((i + 1) / toProcess.length) * 100));

        } catch (error) {
          this.logger.error(
            `Error processing directory ${dir.name}: ${error.message}`,
            error.stack,
            'HMAIProcessor',
          );
          result.errors.push(`${dir.name}: ${error.message}`);
        }
      }

      // 9. Enforce data retention
      await this.dbService.enforceDataRetention(mysqlConnection, lpar, metrics);

      this.logger.log(
        `HMAI ingestion completed for ${lpar}: ${result.directoriesProcessed} directories, ${result.filesProcessed} files, ${result.totalRows} rows`,
        'HMAIProcessor',
      );

      // Record successful job completion
      const durationSeconds = (Date.now() - startTime) / 1000;
      this.metricsService.recordJobComplete(lpar, true, durationSeconds);

      return result;

    } catch (error) {
      this.logger.error(
        `HMAI ingestion job ${job.id} failed: ${error.message}`,
        error.stack,
        'HMAIProcessor',
      );
      
      // Record failed job
      const durationSeconds = (Date.now() - startTime) / 1000;
      this.metricsService.recordJobComplete(lpar, false, durationSeconds);
      
      // Record error type
      if (error.message?.includes('FTP')) {
        this.metricsService.recordError(lpar, 'ftp_error');
      } else if (error.message?.includes('MySQL') || error.message?.includes('database')) {
        this.metricsService.recordError(lpar, 'mysql_error');
      } else {
        this.metricsService.recordError(lpar, 'parse_error');
      }
      
      throw error;
    } finally {
      // Cleanup connections
      if (ftpConnection) {
        await this.ftpClient.disconnect(ftpConnection);
      }
      if (mysqlConnection && !continuousMonitoring) {
        await this.dbService.closeConnection(mysqlConnection);
      }
    }
  }

  /**
   * Process a single directory
   */
  private async processDirectory(
    ftpConnection: FTPClient,
    mysqlConnection: Connection,
    baseDirectory: string,
    dirName: string,
    lpar: string,
    metrics: HMAIMetric[],
  ): Promise<{ filesProcessed: number; totalRows: number; metricStats: Record<string, number> }> {
    this.logger.log(`Processing directory: ${dirName}`, 'HMAIProcessor');

    let filesProcessed = 0;
    let totalRows = 0;
    const processedMetrics: HMAIMetric[] = [];
    const metricStats: Record<string, number> = {}; // Track rows per metric

    try {
      // Change to the directory
      await this.ftpClient.changeDirectory(ftpConnection, dirName);

      // List files
      const files = await this.ftpClient.listFiles(ftpConnection, '.');

      // Filter CSV files
      const csvFiles = files.filter(
        (file) => file.isFile && file.name.endsWith('.csv'),
      );

      // Get existing memory data
      const memoryData = await this.memoryService.readLparData('hmai', lpar);
      const existingProcessedMetrics =
        memoryData[dirName]?.processedMetrics || [];

      // Process each CSV file
      for (const file of csvFiles) {
        const metric = getMetricFromFileName(file.name);

        if (!metric || !metrics.includes(metric)) {
          continue; // Not a metric we're interested in
        }

        // Skip if already processed
        if (existingProcessedMetrics.includes(metric)) {
          this.logger.log(
            `Skipping ${file.name} - already processed`,
            'HMAIProcessor',
          );
          continue;
        }

        try {
          // Download and load file
          const rows = await this.loadCSVFile(
            ftpConnection,
            mysqlConnection,
            file.name,
            metric,
          );

          filesProcessed++;
          totalRows += rows;
          processedMetrics.push(metric);
          metricStats[metric] = (metricStats[metric] || 0) + rows;

          this.logger.log(
            `Processed ${file.name}: ${rows} rows`,
            'HMAIProcessor',
          );
        } catch (error) {
          this.logger.error(
            `Error processing file ${file.name}: ${error.message}`,
            error.stack,
            'HMAIProcessor',
          );
          throw error;
        }
      }

      // Update memory with processed metrics
      const dirDate = parseDirName(dirName);
      const allProcessedMetrics = [
        ...new Set([...existingProcessedMetrics, ...processedMetrics]),
      ];

      await this.memoryService.updateLparData('hmai', lpar, {
        [dirName]: {
          timestamp: dirDate?.toISOString(),
          processedMetrics: allProcessedMetrics,
        },
      });

      // Change back to base directory
      await this.ftpClient.changeDirectory(ftpConnection, baseDirectory);

      return { filesProcessed, totalRows, metricStats };
    } catch (error) {
      // Try to change back to base directory even on error
      try {
        await this.ftpClient.changeDirectory(ftpConnection, baseDirectory);
      } catch (cdError) {
        // Ignore
      }
      throw error;
    }
  }

  /**
   * Load a CSV file from FTP into MySQL
   */
  private async loadCSVFile(
    ftpConnection: FTPClient,
    mysqlConnection: Connection,
    fileName: string,
    metric: HMAIMetric,
  ): Promise<number> {
    // Create a passthrough stream
    const passthroughStream = new PassThrough();

    // Start downloading in the background
    const downloadPromise = ftpConnection.downloadTo(
      passthroughStream,
      fileName,
    );

    // Load data from the stream
    const loadPromise = this.dbService.loadDataFromStream(
      mysqlConnection,
      passthroughStream,
      metric,
    );

    // Wait for both to complete
    await Promise.all([downloadPromise, loadPromise]);

    const rows = await loadPromise;
    return rows;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `HMAI job ${job.id} completed successfully`,
      'HMAIProcessor',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `HMAI job ${job.id} failed: ${error.message}`,
      error.stack,
      'HMAIProcessor',
    );
  }
}

