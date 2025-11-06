/**
 * HMAI (Health Monitoring and Analytics Infrastructure) TypeScript types
 * Based on HMAI CSV structure and MySQL table definitions
 */

/**
 * HMAI metric types (table names)
 */
export const HMAI_METRICS = ['clpr', 'ldev', 'mpb', 'mprank20', 'pgrp', 'port'] as const;

export type HMAIMetric = (typeof HMAI_METRICS)[number];

/**
 * Common HMAI record fields (present in all CSV files)
 */
export interface HMAICommonFields {
  TIMESTAMP: string;
  SMFRSDTE: string;
  SMFRSTME: string;
  SMFRSSID: string;
  SMFRSSSI: string;
  SMFRSIDT: string;
  SMFRSITM: string;
  SMFRSETM: string;
  SMFRSINT: string;
  SMFRSSYN: string;
  SMFRSMDL: string;
  SMFRSSN: string;
  SMFRSMIC: string;
}

/**
 * CLPR (Logical Partition Cache) record
 */
export interface CLPRRecord extends HMAICommonFields {
  RRS3MPID: string;
  RRS3CLID: string;
  RRS3CLNM: string;
  RRS3CCUR: string;
  RRS3CWPU: string;
  RRS3CFPU: string;
  RRS3CSFU: string;
  RRS3CRRO: string;
  RRS3CRRH: string;
  RRS3CRWO: string;
  RRS3CRWH: string;
  RRS3CSRO: string;
  RRS3CSRH: string;
  RRS3CSWO: string;
  RRS3CSWH: string;
  RRS3CFRO: string;
  RRS3CFRH: string;
  RRS3CFWO: string;
  RRS3CFWH: string;
  RRS3CSOD: string;
  RRS3CNOD: string;
  RRS3CNOC: string;
  RRS3CNBD: string;
  RRS3CNBC: string;
}

/**
 * LDEV (Logical Device) record
 */
export interface LDEVRecord extends HMAICommonFields {
  LDEVID: string;
  RRS2CU: string;
  RRS2CCA: string;
  RRS2SSID: string;
  RRS2DEVN: string;
  RRS2VSN: string;
  RRS2STOR: string;
  RRS2CYL: string;
  RRS2SCS: string;
  RRS2DVN: string;
  RRS2TYPE: string;
  RRS2CLID: string;
  RRS2MPID: string;
  RRS2PLID: string;
  RRS2PGRP: string;
  RRS2PSUB: string;
  RRS2EMUT: string;
  RRS2DTOD: string;
  RRS2BR: string;
  RRS2BRH: string;
  RRS2BW: string;
  RRS2BWH: string;
  RRS2SR: string;
  RRS2SRH: string;
  RRS2SW: string;
  RRS2SWH: string;
  RRS2CFR: string;
  RRS2CFRH: string;
  RRS2CFW: string;
  RRS2CFWH: string;
  RRS2STRK: string;
  RRS2OTRK: string;
  RRS2CTRK: string;
  RRS2RTRD: string;
  RRS2RTWR: string;
}

/**
 * MPB (Main Storage Pool Buffer) record
 */
export interface MPBRecord extends HMAICommonFields {
  RRS3MPID: string;
  RRS3MPNM: string;
  RRS3MUR: string;
  RRS3MUOT: string;
  RRS3MUOI: string;
  RRS3MUOE: string;
  RRS3MUMT: string;
  RRS3MUMI: string;
  RRS3MUBE: string;
  RRS3MURO: string;
}

/**
 * MPRANK20 (Top 20 Pools) record
 */
export interface MPRANK20Record extends HMAICommonFields {
  RRS6MPB: string;
  RRS6MP: string;
  RRS6RPTY: string;
  RRS6ROWN: string;
  RRS6RUR: string;
  RRS6RID: string;
}

/**
 * PGRP (Pool Group) record
 */
export interface PGRPRecord extends HMAICommonFields {
  RRS4PGID: string;
  RRS4PSID: string;
  RRS4CLID: string;
  RRS4TYPE: string;
  RRS4MDEL: string;
  RRS4RLVL: string;
  RRS4PLID: string;
  RRS4BEMU: string;
  RRS4SODC: string;
  RRS4RODC: string;
  RRS4NOCD: string;
  RRS4NBDC: string;
  RRS4NBCD: string;
  RRS4NTDC: string;
  RRS4NTCD: string;
}

/**
 * PORT (Port Activity) record
 */
export interface PORTRecord extends HMAICommonFields {
  RRS5POID: string;
  RRS5APID: string;
  RRS5WWN: string;
  RRS5LTYP: string;
  RRS5LADR: string;
  RRS5ERCS: string;
  RRS5EWCS: string;
  RRS5ERTS: string;
  RRS5EWTS: string;
  RRS5ERCB: string;
  RRS5EWCB: string;
  RRS5ERTB: string;
  RRS5EWTB: string;
  RRS5ERCT: string;
  RRS5EWCT: string;
  RRS5ERTT: string;
  RRS5EWTT: string;
  RRS5ERCO: string;
  RRS5EWCO: string;
}

/**
 * Directory naming convention parser result
 * Format: D_YYMMDD_THHMMSS_*
 */
export interface HMAIDirectoryInfo {
  /** Directory name */
  name: string;
  /** Parsed timestamp */
  timestamp: Date;
  /** List of metrics already processed for this directory */
  processedMetrics: HMAIMetric[];
}

/**
 * HMAI FTP ingestion status
 */
export interface HMAIIngestionStatus {
  lpar: string;
  lastCheck: Date;
  totalDirectories: number;
  processedDirectories: number;
  totalFiles: number;
  processedFiles: number;
  errors: string[];
}

