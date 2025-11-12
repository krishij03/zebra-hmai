/**
 * Metrics Service
 * Handles Prometheus metrics collection and scraping
 */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { register, Gauge, collectDefaultMetrics } from 'prom-client';
import { firstValueFrom } from 'rxjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  MetricsConfigDTO,
  MetricDefinitionDTO,
  PrometheusScrapeStatusDTO,
  UpdateMetricsConfigRequestDTO,
  UpdateMetricsConfigResponseDTO,
} from '@zebra/shared/dtos';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private metricsConfig: MetricsConfigDTO = {};
  private metricGauges: Map<string, Gauge> = new Map();
  private scrapeInterval: NodeJS.Timeout | null = null;
  private lastScrapeTime: Date | null = null;
  private scrapeErrors: string[] = [];
  private isScrapingEnabled = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });
  }

  async onModuleInit() {
    try {
      // Load metrics configuration
      await this.loadMetricsConfig();

      // Start scraping if any LPAR has Prometheus enabled
      const hasPrometheusEnabled = this.config.getLpars().some((lpar) => {
        const lparConfig = this.config.getLparConfig(lpar);
        return lparConfig?.usePrometheus === 'true';
      });

      if (hasPrometheusEnabled) {
        this.startScraping();
      }

      this.logger.log('Metrics service initialized', 'MetricsService');
    } catch (error) {
      this.logger.error('Failed to initialize metrics service', error.stack, 'MetricsService');
    }
  }

  onModuleDestroy() {
    this.stopScraping();
    this.logger.log('Metrics service stopped', 'MetricsService');
  }

  /**
   * Get Prometheus metrics in text format
   */
  async getMetrics(): Promise<string> {
    try {
      return await register.metrics();
    } catch (error) {
      this.logger.error('Failed to get metrics', error.stack, 'MetricsService');
      throw new InternalServerErrorException('Failed to retrieve metrics');
    }
  }

  /**
   * Get metrics configuration
   */
  getConfig(): MetricsConfigDTO {
    return this.metricsConfig;
  }

  /**
   * Update metrics configuration
   */
  async updateConfig(request: UpdateMetricsConfigRequestDTO): Promise<UpdateMetricsConfigResponseDTO> {
    const added: string[] = [];
    const updated: string[] = [];
    const errors: string[] = [];

    try {
      if (request.merge) {
        // Merge with existing config
        for (const [name, metric] of Object.entries(request.metrics)) {
          if (this.metricsConfig[name]) {
            updated.push(name);
          } else {
            added.push(name);
          }
          this.metricsConfig[name] = metric;
        }
      } else {
        // Replace entire config
        const oldKeys = Object.keys(this.metricsConfig);
        this.metricsConfig = request.metrics;
        added.push(...Object.keys(request.metrics));
        updated.push(...oldKeys.filter((k) => request.metrics[k]));
      }

      // Save to disk
      await this.saveMetricsConfig();

      // Restart scraping to pick up new config
      if (this.isScrapingEnabled) {
        this.stopScraping();
        this.startScraping();
      }

      this.logger.log(
        `Metrics config updated: ${added.length} added, ${updated.length} updated`,
        'MetricsService',
      );

      return {
        success: true,
        message: 'Metrics configuration updated successfully',
        metricsCount: Object.keys(this.metricsConfig).length,
        added,
        updated,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to update metrics config', error.stack, 'MetricsService');
      throw new InternalServerErrorException('Failed to update metrics configuration');
    }
  }

  /**
   * Get scraping status
   */
  getStatus(): PrometheusScrapeStatusDTO {
    const fullConfig = this.config.getConfig();
    const lpars = this.config
      .getLpars()
      .filter((lpar) => {
        const lparConfig = this.config.getLparConfig(lpar);
        return lparConfig?.usePrometheus === 'true';
      });

    const now = new Date();
    const interval = (fullConfig.rmf3interval || 100) * 1000; // Convert to ms

    return {
      enabled: this.isScrapingEnabled,
      interval: Math.floor(interval / 1000), // Convert back to seconds
      lastScrape: this.lastScrapeTime?.toISOString(),
      nextScrape: this.lastScrapeTime
        ? new Date(this.lastScrapeTime.getTime() + interval).toISOString()
        : new Date(now.getTime() + interval).toISOString(),
      metricsCount: this.metricGauges.size,
      errors: this.scrapeErrors.length > 0 ? this.scrapeErrors : undefined,
      lpars,
    };
  }

  /**
   * Load metrics configuration from file
   */
  private async loadMetricsConfig(): Promise<void> {
    try {
      const metricsPath = process.env.METRICS_CONFIG_PATH || './metrics.json';
      const fullPath = path.resolve(metricsPath);

      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath, 'utf-8');
        this.metricsConfig = JSON.parse(data);
        this.logger.log(`Loaded ${Object.keys(this.metricsConfig).length} metrics from ${fullPath}`, 'MetricsService');
      } else {
        this.logger.warn(`Metrics config not found at ${fullPath}, using empty config`, 'MetricsService');
        this.metricsConfig = {};
      }
    } catch (error) {
      this.logger.error('Failed to load metrics config', error.stack, 'MetricsService');
      this.metricsConfig = {};
    }
  }

  /**
   * Save metrics configuration to file
   */
  private async saveMetricsConfig(): Promise<void> {
    try {
      const metricsPath = process.env.METRICS_CONFIG_PATH || './metrics.json';
      const fullPath = path.resolve(metricsPath);
      fs.writeFileSync(fullPath, JSON.stringify(this.metricsConfig, null, 2), 'utf-8');
      this.logger.log(`Saved metrics config to ${fullPath}`, 'MetricsService');
    } catch (error) {
      this.logger.error('Failed to save metrics config', error.stack, 'MetricsService');
      throw error;
    }
  }

  /**
   * Start periodic scraping
   */
  private startScraping(): void {
    if (this.scrapeInterval) {
      return; // Already running
    }

    const fullConfig = this.config.getConfig();
    const intervalMs = (fullConfig.rmf3interval || 100) * 1000;

    this.isScrapingEnabled = true;
    this.scrapeInterval = setInterval(() => {
      this.scrapeMetrics().catch((error) => {
        this.logger.error('Scrape cycle failed', error.stack, 'MetricsService');
      });
    }, intervalMs);

    // Do initial scrape
    this.scrapeMetrics().catch((error) => {
      this.logger.error('Initial scrape failed', error.stack, 'MetricsService');
    });

    this.logger.log(`Started metrics scraping with ${intervalMs}ms interval`, 'MetricsService');
  }

  /**
   * Stop periodic scraping
   */
  private stopScraping(): void {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      this.scrapeInterval = null;
      this.isScrapingEnabled = false;
      this.logger.log('Stopped metrics scraping', 'MetricsService');
    }
  }

  /**
   * Scrape metrics from RMF3 endpoints
   */
  private async scrapeMetrics(): Promise<void> {
    this.scrapeErrors = [];
    this.lastScrapeTime = new Date();

    try {
      const lpars = this.config
        .getLpars()
        .filter((lpar) => {
          const lparConfig = this.config.getLparConfig(lpar);
          return lparConfig?.usePrometheus === 'true';
        });

      if (lpars.length === 0) {
        return;
      }

      // Group metrics by LPAR and report
      const requestMap: Map<string, Map<string, string>> = new Map();

      for (const [metricName, metric] of Object.entries(this.metricsConfig)) {
        if (!lpars.includes(metric.lpar)) {
          continue;
        }

        if (!requestMap.has(metric.lpar)) {
          requestMap.set(metric.lpar, new Map());
        }

        const lparRequests = requestMap.get(metric.lpar)!;
        if (!lparRequests.has(metric.request.report)) {
          const lparConfig = this.config.getLparConfig(metric.lpar);
          lparRequests.set(
            metric.request.report,
            metric.request.resource || lparConfig?.mvsResource || `,${metric.lpar},MVS_IMAGE`,
          );
        }
      }

      // Fetch and process each report
      for (const [lpar, reports] of requestMap.entries()) {
        for (const [report, resource] of reports.entries()) {
          try {
            await this.scrapeReport(lpar, report, resource);
          } catch (error) {
            const errorMsg = `Failed to scrape ${report} for ${lpar}: ${error.message}`;
            this.scrapeErrors.push(errorMsg);
            this.logger.error(errorMsg, error.stack, 'MetricsService');
          }
        }
      }

      if (this.scrapeErrors.length === 0) {
        this.logger.log(`Scrape completed successfully for ${lpars.length} LPARs`, 'MetricsService');
      }
    } catch (error) {
      const errorMsg = `Scrape cycle error: ${error.message}`;
      this.scrapeErrors.push(errorMsg);
      this.logger.error(errorMsg, error.stack, 'MetricsService');
    }
  }

  /**
   * Scrape a specific report
   */
  private async scrapeReport(lpar: string, report: string, resource: string): Promise<void> {
    const lparConfig = this.config.getLparConfig(lpar);
    const baseUrl = `${lparConfig.ddshhttptype}://${lparConfig.ddsbaseurl}:${lparConfig.ddsbaseport}`;
    const url = `${baseUrl}/gpm/${lparConfig.rmf3filename || 'rmfm3.xml'}?report=${report}&resource=${resource}`;

    try {
      const response = await firstValueFrom(
        this.http.get(url, {
          auth:
            lparConfig.ddsauth === 'true'
              ? {
                  username: lparConfig.ddsuser || '',
                  password: lparConfig.ddspwd || '',
                }
              : undefined,
          httpsAgent: new (require('https').Agent)({
            minVersion: 'TLSv1',
            maxVersion: 'TLSv1.2',
            rejectUnauthorized: false, // Allow self-signed certs for mainframe
          }),
        }),
      );

      // Process the response data for metrics matching this lpar and report
      const metricsToUpdate = Object.entries(this.metricsConfig).filter(
        ([_, metric]) => metric.lpar === lpar && metric.request.report === report,
      );

      // Parse response - handle both RMF3Service format and raw XML
      let data: any;
      if (typeof response.data === 'string') {
        // Would need to parse XML here, but for now assume we get JSON from our own RMF3 service
        data = response.data;
      } else {
        data = response.data;
      }

      // Extract metrics from the table data
      for (const [metricName, metric] of metricsToUpdate) {
        this.processMetricData(metricName, metric, data);
      }
    } catch (error) {
      throw new Error(`HTTP request failed for ${lpar}/${report}: ${error.message}`);
    }
  }

  /**
   * Process metric data and update gauge
   */
  private processMetricData(metricName: string, metric: MetricDefinitionDTO, data: any): void {
    try {
      const table = data.table || data.data || [];
      const identifierKey = metric.identifiers[0]?.key;
      const identifierValue = metric.identifiers[0]?.value;

      if (identifierValue === 'ALL') {
        // Process all rows
        for (const row of table) {
          const rowIdentifier = row[identifierKey];
          const value = row[metric.field];

          if (rowIdentifier && value !== undefined && value !== '' && !Number.isNaN(Number(value))) {
            const gaugeName = this.sanitizeMetricName(`${metric.lpar}_${rowIdentifier}_${metric.field}`);
            this.updateGauge(gaugeName, metric.desc, Number(value), { parm: metric.field });
          }
        }
      } else {
        // Process specific row
        const row = table.find((r: any) => r[identifierKey] === identifierValue);
        if (row) {
          const value = row[metric.field];
          if (value !== undefined && value !== '' && !Number.isNaN(Number(value))) {
            const gaugeName = this.sanitizeMetricName(metricName);
            this.updateGauge(gaugeName, metric.desc, Number(value), { parm: metric.field });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process metric ${metricName}`, error.stack, 'MetricsService');
    }
  }

  /**
   * Update or create a Prometheus gauge
   */
  private updateGauge(name: string, help: string, value: number, labels: Record<string, string>): void {
    try {
      let gauge = this.metricGauges.get(name);

      if (!gauge) {
        gauge = new Gauge({
          name,
          help,
          labelNames: Object.keys(labels),
        });
        this.metricGauges.set(name, gauge);
      }

      gauge.set(labels, value);
    } catch (error) {
      this.logger.error(`Failed to update gauge ${name}`, error.stack, 'MetricsService');
    }
  }

  /**
   * Sanitize metric name for Prometheus
   * Replaces non-alphanumeric characters with underscores
   */
  private sanitizeMetricName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Get a single metric by name
   * Legacy v1 endpoint: GET /:metric
   */
  getMetric(metricName: string): MetricDefinitionDTO | null {
    return this.metricsConfig[metricName] || null;
  }

  /**
   * Create a new metric
   * Legacy v1 endpoint: POST /:metric
   */
  async createMetric(metricName: string, metricData: Omit<MetricDefinitionDTO, 'name'>): Promise<void> {
    if (this.metricsConfig[metricName]) {
      throw new Error(`Metric '${metricName}' already exists`);
    }

    this.metricsConfig[metricName] = {
      name: metricName,
      ...metricData,
    };

    await this.saveMetricsConfig();
    this.logger.log(`Metric '${metricName}' created successfully`, 'MetricsService');
  }

  /**
   * Update an existing metric
   * Legacy v1 endpoint: PUT /:metric
   */
  async updateMetric(metricName: string, metricData: Partial<Omit<MetricDefinitionDTO, 'name'>>): Promise<void> {
    if (!this.metricsConfig[metricName]) {
      throw new Error(`Metric '${metricName}' does not exist`);
    }

    this.metricsConfig[metricName] = {
      ...this.metricsConfig[metricName],
      ...metricData,
      name: metricName, // Ensure name doesn't change
    };

    await this.saveMetricsConfig();
    this.logger.log(`Metric '${metricName}' updated successfully`, 'MetricsService');
  }

  /**
   * Delete a metric
   * Legacy v1 endpoint: DELETE /:metric
   */
  async deleteMetric(metricName: string): Promise<void> {
    if (!this.metricsConfig[metricName]) {
      throw new Error(`Metric '${metricName}' does not exist`);
    }

    delete this.metricsConfig[metricName];

    // Also remove the gauge if it exists
    const sanitizedName = this.sanitizeMetricName(metricName);
    const gauge = this.metricGauges.get(sanitizedName);
    if (gauge) {
      register.removeSingleMetric(sanitizedName);
      this.metricGauges.delete(sanitizedName);
    }

    await this.saveMetricsConfig();
    this.logger.log(`Metric '${metricName}' deleted successfully`, 'MetricsService');
  }
}

