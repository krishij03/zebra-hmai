/**
 * HMAI (Health Monitoring and Analytics Infrastructure) DTOs
 */
import { z } from 'zod';

/**
 * HMAI metrics types
 */
export const hmaiMetricSchema = z.enum(['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port']);

/**
 * HMAI Query Request DTO Schema
 */
export const hmaiQueryRequestSchema = z.object({
  /** LPAR name */
  lpar: z.string().min(1, 'LPAR name is required'),
  /** Metric type */
  metric: hmaiMetricSchema,
  /** Optional time range */
  timeRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  /** Pagination */
  pagination: z
    .object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(1000).default(100),
    })
    .optional(),
  /** Sort order */
  sort: z
    .object({
      field: z.string(),
      order: z.enum(['asc', 'desc']).default('desc'),
    })
    .optional(),
  /** Optional filters (field: value) */
  filters: z.record(z.string()).optional(),
});

export type HMAIQueryRequestDTO = z.infer<typeof hmaiQueryRequestSchema>;

/**
 * HMAI Query Response DTO Schema
 */
export const hmaiQueryResponseSchema = z.object({
  /** LPAR name */
  lpar: z.string(),
  /** Metric type */
  metric: hmaiMetricSchema,
  /** Data rows */
  data: z.array(z.record(z.string())),
  /** Pagination metadata */
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  /** Query execution time (ms) */
  executionTime: z.number().optional(),
});

export type HMAIQueryResponseDTO = z.infer<typeof hmaiQueryResponseSchema>;

/**
 * HMAI Ingestion Status Request DTO Schema
 */
export const hmaiIngestionStatusRequestSchema = z.object({
  /** LPAR name */
  lpar: z.string().min(1, 'LPAR name is required'),
  /** Include detailed directory info */
  includeDetails: z.boolean().default(false),
});

export type HMAIIngestionStatusRequestDTO = z.infer<typeof hmaiIngestionStatusRequestSchema>;

/**
 * HMAI Ingestion Status Response DTO Schema
 */
export const hmaiIngestionStatusResponseSchema = z.object({
  lpar: z.string(),
  status: z.enum(['idle', 'running', 'error', 'paused']),
  lastCheck: z.string().datetime().optional(),
  lastSuccessfulIngestion: z.string().datetime().optional(),
  statistics: z.object({
    totalDirectories: z.number().int(),
    processedDirectories: z.number().int(),
    totalFiles: z.number().int(),
    processedFiles: z.number().int(),
    failedFiles: z.number().int(),
  }),
  errors: z.array(z.string()).optional(),
  currentDirectory: z.string().optional(),
  estimatedCompletion: z.string().datetime().optional(),
});

export type HMAIIngestionStatusResponseDTO = z.infer<typeof hmaiIngestionStatusResponseSchema>;

/**
 * HMAI Start Ingestion Request DTO Schema
 */
export const hmaiStartIngestionRequestSchema = z.object({
  /** LPAR name */
  lpar: z.string().min(1, 'LPAR name is required'),
  /** Metrics to ingest */
  metrics: z.array(hmaiMetricSchema).min(1, 'At least one metric required'),
  /** Start date (YYYY-MM-DD) */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  /** Optional end date (YYYY-MM-DD) */
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  /** Whether to force re-ingestion of existing data */
  force: z.boolean().default(false),
  /** Whether to enable continuous monitoring */
  continuousMonitoring: z.boolean().default(false),
});

export type HMAIStartIngestionRequestDTO = z.infer<typeof hmaiStartIngestionRequestSchema>;

/**
 * HMAI Start Ingestion Response DTO Schema
 */
export const hmaiStartIngestionResponseSchema = z.object({
  lpar: z.string(),
  jobId: z.string(),
  status: z.enum(['queued', 'started', 'error']),
  message: z.string(),
  estimatedDirectories: z.number().int().optional(),
});

export type HMAIStartIngestionResponseDTO = z.infer<typeof hmaiStartIngestionResponseSchema>;

/**
 * HMRE Query Request DTO Schema (similar to HMAI)
 */
export const hmreQueryRequestSchema = z.object({
  lpar: z.string().min(1, 'LPAR name is required'),
  type: z.enum(['hmrecsvs', 'hmrecsvd']),
  timeRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(1000).default(100),
    })
    .optional(),
});

export type HMREQueryRequestDTO = z.infer<typeof hmreQueryRequestSchema>;

/**
 * HMRE Query Response DTO Schema
 */
export const hmreQueryResponseSchema = z.object({
  lpar: z.string(),
  type: z.enum(['hmrecsvs', 'hmrecsvd']),
  data: z.array(z.record(z.string())),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type HMREQueryResponseDTO = z.infer<typeof hmreQueryResponseSchema>;

/**
 * DCOL Query Request DTO Schema
 */
export const dcolQueryRequestSchema = z.object({
  lpar: z.string().min(1, 'LPAR name is required'),
  timeRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(1000).default(100),
    })
    .optional(),
});

export type DCOLQueryRequestDTO = z.infer<typeof dcolQueryRequestSchema>;

/**
 * DCOL Query Response DTO Schema
 */
export const dcolQueryResponseSchema = z.object({
  lpar: z.string(),
  data: z.array(z.record(z.string())),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type DCOLQueryResponseDTO = z.infer<typeof dcolQueryResponseSchema>;

