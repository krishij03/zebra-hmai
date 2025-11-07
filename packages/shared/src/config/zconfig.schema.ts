/**
 * Zod schema for Zconfig.json validation
 * This schema validates the entire configuration file used by Zebra HMAI
 * Based on config/Zconfig.json structure
 */
import { z } from 'zod';

/**
 * FTP configuration for HMAI/HMRE/DCOL data sources
 */
const ftpConfigSchema = z.object({
  directory: z.string().min(1, 'FTP directory path is required'),
});

/**
 * MySQL/MariaDB connection configuration
 */
const mysqlConfigSchema = z.object({
  host: z.string().min(1, 'MySQL host is required'),
  user: z.string().min(1, 'MySQL user is required'),
  password: z.string().min(1, 'MySQL password is required'),
  database: z.string().optional(),
  port: z.number().int().positive().default(3306),
});

/**
 * Data retention configuration (in days)
 */
const dataRetentionSchema = z.record(z.coerce.number().int().nonnegative());

/**
 * HMAI (Health Monitoring and Analytics Infrastructure) configuration
 */
const hmaiConfigSchema = z.object({
  ftp: ftpConfigSchema,
  mysql: mysqlConfigSchema,
  dataRetention: dataRetentionSchema.optional(),
  checkInterval: z.coerce.number().int().positive().default(30),
  defaultStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  continuousMonitoring: z.boolean().default(false),
});

/**
 * HMRE (Health Monitoring and Reporting Enhancements) configuration
 */
const hmreConfigSchema = z.object({
  ftp: ftpConfigSchema.optional(),
  mysql: mysqlConfigSchema.optional(),
  dataRetention: dataRetentionSchema.optional(),
  checkInterval: z.coerce.number().int().positive().optional(),
  defaultStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  continuousMonitoring: z.boolean().default(false),
}).passthrough();

/**
 * DCOL (Data Collection) configuration
 */
const dcolConfigSchema = z.object({
  ftp: ftpConfigSchema.optional(),
  mysql: mysqlConfigSchema.optional(),
  dataRetention: dataRetentionSchema.optional(),
  checkInterval: z.coerce.number().int().positive().optional(),
  defaultStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  continuousMonitoring: z.boolean().default(false),
}).passthrough();

/**
 * RMF Monitor I configuration (cache, device)
 */
const rmfMon1ConfigSchema = z.object({
  mysql: mysqlConfigSchema.optional(),
  cache: z
    .object({
      checkInterval: z.coerce.number().int().positive().optional(),
      dataRetention: z.coerce.number().int().nonnegative().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
      continuousMonitoring: z.boolean().default(false),
    })
    .passthrough()
    .optional(),
  device: z
    .object({
      checkInterval: z.coerce.number().int().positive().optional(),
      dataRetention: z.coerce.number().int().nonnegative().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
      continuousMonitoring: z.boolean().default(false),
    })
    .passthrough()
    .optional(),
  continuousMonitoring: z.boolean().default(false),
}).passthrough();

/**
 * DDS (Data Delivery Service) LPAR configuration
 */
const lparConfigSchema = z.object({
  ddshhttptype: z.enum(['http', 'https']).default('https'),
  ddsbaseurl: z.string().min(1, 'DDS base URL is required'),
  ddsbaseport: z.coerce.number().int().positive().default(8803),
  ddsauth: z.enum(['true', 'false']).default('true'),
  ddsuser: z.string().optional(),
  ddspwd: z.string().optional(),
  rmf3filename: z.string().default('rmfm3.xml'),
  rmfppfilename: z.string().default('rmfpp.xml'),
  mvsResource: z.string(),
  PCI: z.string().optional(),
  useMongo: z.enum(['true', 'false']).default('false'),
  usePrometheus: z.enum(['true', 'false']).default('false'),
  hmai: hmaiConfigSchema.optional(),
  hmre: hmreConfigSchema.optional(),
  dcol: dcolConfigSchema.optional(),
  rmfmon1: rmfMon1ConfigSchema.optional(),
});

/**
 * Main Zconfig schema
 */
export const zconfigSchema = z
  .object({
    // MongoDB configuration (optional, legacy)
    mongourl: z.string().default('localhost'),
    mongoport: z.coerce.number().int().positive().default(27017),
    dbinterval: z.coerce.number().int().positive().default(100),
    dbname: z.string().default('ZebraDB'),
    useDbAuth: z.enum(['true', 'false']).default('false'),
    dbUser: z.string().optional(),
    dbPassword: z.string().optional(),
    authSource: z.string().default('admin'),

    // Application configuration
    appurl: z.string().default('localhost'),
    appport: z.coerce.number().int().positive().default(3090),
    zebra_httptype: z.enum(['http', 'https']).default('http'),
    use_cert: z.enum(['true', 'false']).default('false'),

    // RMF intervals
    ppminutesInterval: z.coerce.number().int().positive().default(30),
    rmf3interval: z.coerce.number().int().positive().default(100),

    // Grafana configuration
    grafanaurl: z.string().optional(),
    grafanaport: z.coerce.number().int().positive().optional(),
    grafanahttptype: z.enum(['http', 'https']).optional(),

    // DDS LPAR configurations
    dds: z.record(z.string(), lparConfigSchema),

    // Optional: API ML configuration for Zowe
    apiml_IP: z.string().optional(),
    apiml_http_type: z.enum(['http', 'https']).optional(),
    apiml_password: z.string().optional(),
    apiml_username: z.string().optional(),
    apiml_port: z.coerce.number().int().positive().optional(),
    apiml_auth_type: z.enum(['bypass', 'basic', 'oauth']).optional(),
  })
  .strict();

/**
 * Inferred TypeScript type from Zconfig schema
 */
export type ZConfig = z.infer<typeof zconfigSchema>;
export type LParConfig = z.infer<typeof lparConfigSchema>;
export type HmaiConfig = z.infer<typeof hmaiConfigSchema>;
export type HmreConfig = z.infer<typeof hmreConfigSchema>;
export type DcolConfig = z.infer<typeof dcolConfigSchema>;
export type RmfMon1Config = z.infer<typeof rmfMon1ConfigSchema>;
export type MySQLConfig = z.infer<typeof mysqlConfigSchema>;
export type FTPConfig = z.infer<typeof ftpConfigSchema>;

