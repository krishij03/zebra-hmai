/**
 * RMF (Resource Measurement Facility) DTOs
 * Data Transfer Objects for API request/response
 */
import { z } from 'zod';

/**
 * RMF Monitor III Report Request DTO Schema
 */
export const rmfMonitor3RequestSchema = z.object({
  /** LPAR name */
  lpar: z.string().min(1, 'LPAR name is required'),
  /** Report type */
  report: z.enum([
    'CHANNEL',
    'CPC',
    'DELAY',
    'DEV',
    'DEVR',
    'DSND',
    'EADM',
    'ENCLAVE',
    'ENQ',
    'HSM',
    'JES',
    'OPD',
    'PROC',
    'PROCU',
    'STOR',
    'STORC',
    'STORCR',
    'STORM',
    'SYSINFO',
    'USAGE',
    'SYSSUM',
  ]),
  /** Optional resource filter (e.g., ',LPAR1,MVS_IMAGE') */
  resource: z.string().optional(),
  /** Additional query parameters */
  params: z.record(z.string()).optional(),
});

export type RMFMonitor3RequestDTO = z.infer<typeof rmfMonitor3RequestSchema>;

/**
 * RMF Monitor III Report Response DTO Schema
 */
export const rmfMonitor3ResponseSchema = z.object({
  /** Report title/description */
  title: z.string(),
  /** Start timestamp (MM/DD/YYYY HH:MM:SS) */
  timestart: z.string(),
  /** End timestamp (MM/DD/YYYY HH:MM:SS) */
  timeend: z.string(),
  /** Column headers */
  columnhead: z.array(z.string()),
  /** Optional caption key-value pairs */
  caption: z.record(z.string()).optional(),
  /** Table data rows */
  table: z.array(z.record(z.string())),
  /** Metadata */
  metadata: z
    .object({
      lpar: z.string(),
      report: z.string(),
      fetchedAt: z.string().datetime(),
    })
    .optional(),
});

export type RMFMonitor3ResponseDTO = z.infer<typeof rmfMonitor3ResponseSchema>;

/**
 * RMF Post Processor Request DTO Schema
 */
export const rmfPostProcessorRequestSchema = z.object({
  /** LPAR name */
  lpar: z.string().min(1, 'LPAR name is required'),
  /** Report type */
  report: z.enum([
    'CACHE',
    'CHAN',
    'CPU',
    'CRYPTO',
    'DEVICE',
    'EADM',
    'HFS',
    'IOQ',
    'OMVS',
    'PAGESP',
    'PAGING',
    'SDELAY',
    'VSTOR',
    'XCF',
    'CF',
    'WLMGL',
  ]),
  /** Optional resource filter */
  resource: z.string().optional(),
  /** Optional time range */
  timeRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
});

export type RMFPostProcessorRequestDTO = z.infer<typeof rmfPostProcessorRequestSchema>;

/**
 * RMF Post Processor Response DTO Schema
 */
export const rmfPostProcessorResponseSchema = z.object({
  /** Report title/description */
  title: z.string(),
  /** Start timestamp */
  timestart: z.string(),
  /** End timestamp */
  timeend: z.string(),
  /** Column headers */
  columnhead: z.array(z.string()),
  /** Optional caption key-value pairs */
  caption: z.record(z.string()).optional(),
  /** Table data rows */
  table: z.array(z.record(z.string())),
  /** Metadata */
  metadata: z
    .object({
      lpar: z.string(),
      report: z.string(),
      fetchedAt: z.string().datetime(),
    })
    .optional(),
});

export type RMFPostProcessorResponseDTO = z.infer<typeof rmfPostProcessorResponseSchema>;

/**
 * RMF Report List Request DTO Schema
 */
export const rmfReportListRequestSchema = z.object({
  /** LPAR name */
  lpar: z.string().min(1, 'LPAR name is required'),
  /** Report type filter (Monitor III or Post Processor) */
  type: z.enum(['rmf3', 'rmfpp', 'all']).default('all'),
});

export type RMFReportListRequestDTO = z.infer<typeof rmfReportListRequestSchema>;

/**
 * RMF Report List Response DTO Schema
 */
export const rmfReportListResponseSchema = z.object({
  lpar: z.string(),
  rmf3Reports: z.array(z.string()).optional(),
  rmfppReports: z.array(z.string()).optional(),
});

export type RMFReportListResponseDTO = z.infer<typeof rmfReportListResponseSchema>;

/**
 * Error Response DTO Schema
 */
export const errorResponseSchema = z.object({
  /** Error code */
  code: z.string(),
  /** Error message */
  message: z.string(),
  /** Detailed error information */
  details: z.any().optional(),
  /** Timestamp of the error */
  timestamp: z.string().datetime(),
  /** Request path that caused the error */
  path: z.string().optional(),
});

export type ErrorResponseDTO = z.infer<typeof errorResponseSchema>;

