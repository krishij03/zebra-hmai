/**
 * DTOs for Zconfig management
 * Based on legacy v1 config.js endpoints
 */
import { z } from 'zod';

// Update general config settings
export const UpdateConfigRequestDTOSchema = z.object({
  mongourl: z.string().optional(),
  mongoport: z.string().optional(),
  dbname: z.string().optional(),
  dbinterval: z.string().optional(),
  appurl: z.string().optional(),
  appport: z.string().optional(),
  rmf3interval: z.string().optional(),
  ppminutesInterval: z.string().optional(),
  zebra_httptype: z.enum(['http', 'https']).optional(),
  use_cert: z.enum(['true', 'false']).optional(),
  useDbAuth: z.enum(['true', 'false']).optional(),
  dbUser: z.string().optional(),
  dbPassword: z.string().optional(),
  authSource: z.string().optional(),
  grafanaurl: z.string().optional(),
  grafanaport: z.string().optional(),
  grafanahttptype: z.enum(['http', 'https']).optional(),
  apiml_IP: z.string().optional(),
  apiml_port: z.string().optional(),
  apiml_http_type: z.enum(['http', 'https']).optional(),
  apiml_username: z.string().optional(),
  apiml_password: z.string().optional(),
  apiml_auth_type: z.string().optional(),
});

export type UpdateConfigRequestDTO = z.infer<typeof UpdateConfigRequestDTOSchema>;

// Update DDS (LPAR) configuration
export const UpdateDdsRequestDTOSchema = z.object({
  ddshhttptype: z.enum(['http', 'https']).optional(),
  ddsbaseurl: z.string().optional(),
  ddsbaseport: z.string().optional(),
  ddsauth: z.enum(['true', 'false']).optional(),
  ddsuser: z.string().optional(),
  ddspwd: z.string().optional(),
  rmf3filename: z.string().optional(),
  rmfppfilename: z.string().optional(),
  mvsResource: z.string().optional(),
  PCI: z.string().optional(),
  useMongo: z.enum(['true', 'false']).optional(),
  usePrometheus: z.enum(['true', 'false']).optional(),
  hmai: z.object({
    ftp: z.object({
      directory: z.string(),
    }).optional(),
    mysql: z.object({
      host: z.string(),
      user: z.string(),
      password: z.string(),
    }).optional(),
    dataRetention: z.record(z.string()).optional(),
    rmfmon1Retention: z.object({
      cache: z.string(),
      device: z.string(),
    }).optional(),
    checkInterval: z.string().optional(),
    defaultStartDate: z.string().optional(),
    continuousMonitoring: z.boolean().optional(),
  }).optional(),
  hmre: z.object({
    ftp: z.object({
      directory: z.string(),
    }).optional(),
    mysql: z.object({
      host: z.string(),
      user: z.string(),
      password: z.string(),
    }).optional(),
    dataRetention: z.record(z.string()).optional(),
    checkInterval: z.string().optional(),
    defaultStartDate: z.string().optional(),
    continuousMonitoring: z.boolean().optional(),
  }).optional(),
  dcol: z.object({
    ftp: z.object({
      directory: z.string(),
    }).optional(),
    mysql: z.object({
      host: z.string(),
      user: z.string(),
      password: z.string(),
    }).optional(),
    dataRetention: z.record(z.string()).optional(),
    checkInterval: z.string().optional(),
    defaultStartDate: z.string().optional(),
    continuousMonitoring: z.boolean().optional(),
  }).optional(),
  rmfmon1: z.object({
    mysql: z.object({
      host: z.string(),
      user: z.string(),
      password: z.string(),
    }).optional(),
    cache: z.object({
      checkInterval: z.string(),
      dataRetention: z.string(),
      startDate: z.string(),
      continuousMonitoring: z.boolean(),
    }).optional(),
    device: z.object({
      checkInterval: z.string(),
      dataRetention: z.string(),
      startDate: z.string(),
      continuousMonitoring: z.boolean(),
    }).optional(),
    continuousMonitoring: z.boolean().optional(),
  }).optional(),
});

export type UpdateDdsRequestDTO = z.infer<typeof UpdateDdsRequestDTOSchema>;

// Delete LPAR request
export const DeleteDdsRequestDTOSchema = z.object({
  lpar: z.string(),
});

export type DeleteDdsRequestDTO = z.infer<typeof DeleteDdsRequestDTOSchema>;

// Response DTOs
export const ConfigResponseDTOSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

export type ConfigResponseDTO = z.infer<typeof ConfigResponseDTOSchema>;

