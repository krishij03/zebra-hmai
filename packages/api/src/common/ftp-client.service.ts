/**
 * FTP Client Service
 * Reusable FTP/FTPS connection manager using basic-ftp
 * Provides connection pooling and error handling
 */
import { Injectable } from '@nestjs/common';
import { Client as FTPClient, FileInfo } from 'basic-ftp';
import { Writable } from 'stream';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';

export interface FTPConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  secure?: boolean;
}

@Injectable()
export class FtpClientService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create and connect an FTP client for a specific LPAR and module
   */
  async connect(
    lpar: string,
    module: 'hmai' | 'hmre' | 'dcol',
  ): Promise<FTPClient> {
    const lparConfig = this.config.getLparConfig(lpar);
    
    if (!lparConfig) {
      throw new Error(`LPAR '${lpar}' not found in configuration`);
    }

    // Get FTP config from module-specific settings
    // Uses DDS credentials since they're shared in the legacy implementation
    const ftpConfig: FTPConfig = {
      host: lparConfig.ddsbaseurl || '',
      port: 21, // Default FTP port
      user: lparConfig.ddsuser || '',
      password: lparConfig.ddspwd || '',
      secure: false, // Legacy uses non-secure FTP
    };
    
    if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
      throw new Error(`Invalid FTP configuration for LPAR '${lpar}'`);
    }

    const client = new FTPClient();
    client.ftp.verbose = process.env.FTP_VERBOSE === 'true'; // Enable for debugging

    try {
      await client.access({
        host: ftpConfig.host,
        port: ftpConfig.port,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: ftpConfig.secure,
      });

      this.logger.log(
        `FTP connected to ${ftpConfig.host} for ${lpar}/${module}`,
        'FtpClientService',
      );

      return client;
    } catch (error) {
      this.logger.error(
        `Failed to connect FTP for ${lpar}/${module}: ${error.message}`,
        error.stack,
        'FtpClientService',
      );
      throw error;
    }
  }

  /**
   * Disconnect FTP client
   */
  async disconnect(client: FTPClient): Promise<void> {
    try {
      client.close();
      this.logger.log('FTP connection closed', 'FtpClientService');
    } catch (error) {
      this.logger.warn(
        `Error closing FTP connection: ${error.message}`,
        'FtpClientService',
      );
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(client: FTPClient, directory: string): Promise<FileInfo[]> {
    try {
      return await client.list(directory);
    } catch (error) {
      this.logger.error(
        `Failed to list directory ${directory}: ${error.message}`,
        error.stack,
        'FtpClientService',
      );
      throw error;
    }
  }

  /**
   * Download a file to a writable stream
   */
  async downloadFile(
    client: FTPClient,
    remotePath: string,
    writable: Writable,
  ): Promise<void> {
    try {
      await client.downloadTo(writable, remotePath);
    } catch (error) {
      this.logger.error(
        `Failed to download file ${remotePath}: ${error.message}`,
        error.stack,
        'FtpClientService',
      );
      throw error;
    }
  }

  /**
   * Change working directory
   */
  async changeDirectory(client: FTPClient, directory: string): Promise<void> {
    try {
      await client.cd(directory);
    } catch (error) {
      this.logger.error(
        `Failed to change directory to ${directory}: ${error.message}`,
        error.stack,
        'FtpClientService',
      );
      throw error;
    }
  }

  /**
   * Get current working directory
   */
  async getCurrentDirectory(client: FTPClient): Promise<string> {
    try {
      return await client.pwd();
    } catch (error) {
      this.logger.error(
        `Failed to get current directory: ${error.message}`,
        error.stack,
        'FtpClientService',
      );
      throw error;
    }
  }
}

