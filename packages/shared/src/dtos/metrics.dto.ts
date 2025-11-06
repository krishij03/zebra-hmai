/**
 * Metrics and Prometheus DTOs
 */
import { z } from 'zod';

/**
 * Metric Definition DTO Schema
 */
export const metricDefinitionSchema = z.object({
  /** Metric name */
  name: z.string().min(1),
  /** Metric description */
  desc: z.string(),
  /** LPAR this metric belongs to */
  lpar: z.string(),
  /** Request configuration */
  request: z.object({
    /** Report type */
    report: z.string(),
    /** Optional resource override */
    resource: z.string().optional(),
  }),
  /** Field to extract from the report */
  field: z.string(),
  /** Identifiers for matching specific rows */
  identifiers: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
});

export type MetricDefinitionDTO = z.infer<typeof metricDefinitionSchema>;

/**
 * Metrics Configuration DTO Schema
 */
export const metricsConfigSchema = z.record(metricDefinitionSchema);

export type MetricsConfigDTO = z.infer<typeof metricsConfigSchema>;

/**
 * Prometheus Metrics Query Request DTO Schema
 */
export const prometheusMetricsRequestSchema = z.object({
  /** Optional LPAR filter */
  lpar: z.string().optional(),
  /** Optional metric name filter */
  metric: z.string().optional(),
  /** Whether to include help text */
  includeHelp: z.boolean().default(true),
});

export type PrometheusMetricsRequestDTO = z.infer<typeof prometheusMetricsRequestSchema>;

/**
 * Prometheus Scrape Status DTO Schema
 */
export const prometheusScrapeStatusSchema = z.object({
  /** Whether scraping is enabled */
  enabled: z.boolean(),
  /** Scrape interval (seconds) */
  interval: z.number().int().positive(),
  /** Last scrape timestamp */
  lastScrape: z.string().datetime().optional(),
  /** Next scheduled scrape timestamp */
  nextScrape: z.string().datetime().optional(),
  /** Number of metrics currently registered */
  metricsCount: z.number().int().nonnegative(),
  /** Scrape errors */
  errors: z.array(z.string()).optional(),
  /** LPARs being scraped */
  lpars: z.array(z.string()),
});

export type PrometheusScrapeStatusDTO = z.infer<typeof prometheusScrapeStatusSchema>;

/**
 * Update Metrics Configuration Request DTO Schema
 */
export const updateMetricsConfigRequestSchema = z.object({
  /** Metrics to add or update */
  metrics: metricsConfigSchema,
  /** Whether to merge with existing config or replace */
  merge: z.boolean().default(true),
});

export type UpdateMetricsConfigRequestDTO = z.infer<typeof updateMetricsConfigRequestSchema>;

/**
 * Update Metrics Configuration Response DTO Schema
 */
export const updateMetricsConfigResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  metricsCount: z.number().int(),
  updated: z.array(z.string()),
  added: z.array(z.string()),
  errors: z.array(z.string()).optional(),
});

export type UpdateMetricsConfigResponseDTO = z.infer<typeof updateMetricsConfigResponseSchema>;

/**
 * Create Single Metric Request DTO Schema
 * Legacy v1 endpoint: POST /:metric
 */
export const createMetricRequestSchema = metricDefinitionSchema.omit({ name: true });

export type CreateMetricRequestDTO = z.infer<typeof createMetricRequestSchema>;

/**
 * Update Single Metric Request DTO Schema  
 * Legacy v1 endpoint: PUT /:metric
 */
export const updateMetricRequestSchema = metricDefinitionSchema.omit({ name: true }).partial();

export type UpdateMetricRequestDTO = z.infer<typeof updateMetricRequestSchema>;

/**
 * Single Metric Response DTO Schema
 */
export const metricResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: metricDefinitionSchema.optional(),
  error: z.boolean().optional(),
});

export type MetricResponseDTO = z.infer<typeof metricResponseSchema>;

