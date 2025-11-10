/**
 * RMF Report Type Constants
 * Migrated from src/constants.js
 */

/**
 * RMF Monitor III Report Types
 */
export const RMFM3_REPORTS = [
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
] as const;

/**
 * RMF Post Processor Report Types
 */
export const RMFPP_REPORTS = [
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

/**
 * Report resource type mapping
 * Maps report names to their resource type (MVS_IMAGE or SYSPLEX)
 */
export const REPORT_TYPE_MAP: Record<string, 'MVS_IMAGE' | 'SYSPLEX'> = {
  CACHDET: 'SYSPLEX',
  CACHSUM: 'SYSPLEX',
  CFACT: 'SYSPLEX',
  CFOVER: 'SYSPLEX',
  CFSYS: 'SYSPLEX',
  CHANNEL: 'MVS_IMAGE',
  CPC: 'MVS_IMAGE',
  CRYPTO: 'SYSPLEX',
  DELAY: 'MVS_IMAGE',
  DEV: 'MVS_IMAGE',
  DEVR: 'MVS_IMAGE',
  DI: 'SYSPLEX',
  DSND: 'MVS_IMAGE',
  DSNJ: 'SYSPLEX',
  DSNV: 'SYSPLEX',
  EADM: 'MVS_IMAGE',
  ENCLAVE: 'MVS_IMAGE',
  ENQ: 'MVS_IMAGE',
  ENQR: 'SYSPLEX',
  HSM: 'MVS_IMAGE',
  IOQUEUE: 'SYSPLEX',
  JES: 'MVS_IMAGE',
  JOB: 'SYSPLEX',
  LOCKSP: 'SYSPLEX',
  LOCKSU: 'SYSPLEX',
  OPD: 'MVS_IMAGE',
  PCIE: 'SYSPLEX',
  PROC: 'MVS_IMAGE',
  PROCU: 'MVS_IMAGE',
  RLSDS: 'SYSPLEX',
  RLSLRU: 'SYSPLEX',
  RLSSC: 'SYSPLEX',
  SPACED: 'SYSPLEX',
  SPACEG: 'SYSPLEX',
  STOR: 'MVS_IMAGE',
  STORC: 'MVS_IMAGE',
  STORCR: 'MVS_IMAGE',
  STORF: 'MVS_IMAGE',
  STORM: 'MVS_IMAGE',
  STORR: 'MVS_IMAGE',
  STORS: 'MVS_IMAGE',
  SYSENQ: 'SYSPLEX',
  SYSINFO: 'MVS_IMAGE',
  SYSRG: 'SYSPLEX',
  SYSRTD: 'SYSPLEX',
  SYSSUM: 'SYSPLEX',
  SYSWKM: 'SYSPLEX',
  USAGE: 'MVS_IMAGE',
  WFEX: 'SYSPLEX',
  XCF: 'SYSPLEX',
  ZFSFS: 'SYSPLEX',
  ZFSKN: 'SYSPLEX',
  ZFSOVW: 'SYSPLEX',
} as const;


