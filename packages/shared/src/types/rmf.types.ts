/**
 * RMF (Resource Measurement Facility) TypeScript types
 * Based on RMF Monitor III and RMF Post Processor data structures
 */

/**
 * RMF report types from constants.js
 */
export const RMF_MONITOR_III_REPORTS = [
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
] as const;

export const RMF_POSTPROCESSOR_REPORTS = [
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
] as const;

export type RMFMonitorIIIReport = (typeof RMF_MONITOR_III_REPORTS)[number];
export type RMFPostProcessorReport = (typeof RMF_POSTPROCESSOR_REPORTS)[number];

/**
 * Report resource types (MVS_IMAGE or SYSPLEX)
 */
export type ReportResourceType = 'MVS_IMAGE' | 'SYSPLEX';

/**
 * Parsed RMF Monitor III JSON structure
 * Output from RMFMonitor3parser.js
 */
export interface RMFMonitor3Data {
  /** Report description/title */
  title: string;
  /** Start timestamp in MM/DD/YYYY HH:MM:SS format */
  timestart: string;
  /** End timestamp in MM/DD/YYYY HH:MM:SS format */
  timeend: string;
  /** Column headers for the table */
  columnhead: string[];
  /** Optional caption key-value pairs */
  caption?: Record<string, string>;
  /** Table data rows */
  table: Record<string, string>[];
}

/**
 * Parsed RMF Post Processor JSON structure
 * Output from RMFPPparser.js
 */
export interface RMFPostProcessorData {
  /** Report description/title */
  title: string;
  /** Start timestamp */
  timestart: string;
  /** End timestamp */
  timeend: string;
  /** Column headers for the table */
  columnhead: string[];
  /** Optional caption key-value pairs */
  caption?: Record<string, string>;
  /** Table data rows */
  table: Record<string, string>[];
}

/**
 * DDS (Data Delivery Service) request parameters
 */
export interface DDSRequestParams {
  /** LPAR name */
  lpar: string;
  /** Report type (e.g., 'CPC', 'PROC', 'USAGE') */
  report: RMFMonitorIIIReport | RMFPostProcessorReport;
  /** Resource filter (e.g., ',LPAR1,MVS_IMAGE') */
  resource?: string;
  /** Additional query parameters */
  [key: string]: string | undefined;
}

