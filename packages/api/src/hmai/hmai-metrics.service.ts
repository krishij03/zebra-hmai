/**
 * HMAI Metrics Service
 * Prometheus metrics for HMAI ingestion job monitoring
 * 
 * Note: This tracks INGESTION jobs, not HMAI data itself.
 * HMAI data is stored in MySQL, not exposed as Prometheus metrics.
 * Only RMF Monitor III uses Prometheus for data metrics.
 */
import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class HMAIMetricsService {
  // Job completion counter
  private readonly jobsTotal: Counter<string>;

  // Job duration histogram
  private readonly jobDuration: Histogram<string>;

  // Files processed counter
  private readonly filesProcessed: Counter<string>;

  // Rows inserted counter
  private readonly rowsInserted: Counter<string>;

  // Active jobs gauge
  private readonly activeJobs: Gauge<string>;

  // Errors counter
  private readonly errors: Counter<string>;

  constructor() {
    // Job completion counter (success/failure)
    this.jobsTotal = new Counter({
      name: 'hmai_ingestion_jobs_total',
      help: 'Total number of HMAI ingestion jobs processed',
      labelNames: ['lpar', 'status'], // status: success, failure
      registers: [register],
    });

    // Job duration histogram
    this.jobDuration = new Histogram({
      name: 'hmai_ingestion_duration_seconds',
      help: 'Duration of HMAI ingestion jobs in seconds',
      labelNames: ['lpar'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1s to 10min
      registers: [register],
    });

    // Files processed counter
    this.filesProcessed = new Counter({
      name: 'hmai_ingestion_files_processed_total',
      help: 'Total number of CSV files processed by HMAI ingestion',
      labelNames: ['lpar', 'metric'], // metric: clpr, ldev, etc.
      registers: [register],
    });

    // Rows inserted counter
    this.rowsInserted = new Counter({
      name: 'hmai_ingestion_rows_inserted_total',
      help: 'Total number of rows inserted into MySQL by HMAI ingestion',
      labelNames: ['lpar', 'metric'],
      registers: [register],
    });

    // Active jobs gauge
    this.activeJobs = new Gauge({
      name: 'hmai_ingestion_active_jobs',
      help: 'Number of currently active HMAI ingestion jobs',
      labelNames: ['lpar'],
      registers: [register],
    });

    // Errors counter
    this.errors = new Counter({
      name: 'hmai_ingestion_errors_total',
      help: 'Total number of errors during HMAI ingestion',
      labelNames: ['lpar', 'type'], // type: ftp_error, mysql_error, parse_error
      registers: [register],
    });
  }

  /**
   * Record job start
   */
  recordJobStart(lpar: string): void {
    this.activeJobs.inc({ lpar });
  }

  /**
   * Record job completion
   */
  recordJobComplete(lpar: string, success: boolean, durationSeconds: number): void {
    this.activeJobs.dec({ lpar });
    this.jobsTotal.inc({ lpar, status: success ? 'success' : 'failure' });
    this.jobDuration.observe({ lpar }, durationSeconds);
  }

  /**
   * Record files processed
   */
  recordFilesProcessed(lpar: string, metric: string, count: number): void {
    this.filesProcessed.inc({ lpar, metric }, count);
  }

  /**
   * Record rows inserted
   */
  recordRowsInserted(lpar: string, metric: string, count: number): void {
    this.rowsInserted.inc({ lpar, metric }, count);
  }

  /**
   * Record error
   */
  recordError(lpar: string, errorType: 'ftp_error' | 'mysql_error' | 'parse_error'): void {
    this.errors.inc({ lpar, type: errorType });
  }

  /**
   * Get all metrics (for /metrics endpoint)
   * Note: This is already handled by the global metrics service
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}

