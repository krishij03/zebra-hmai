/**
 * Configuration service
 * Provides access to validated Zconfig.json
 */
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { loadConfig, type ZConfig } from '@zebra/shared/config';
import { LoggerService } from '../logger/logger.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ConfigService implements OnModuleInit {
  private config!: ZConfig;

  constructor(
    @Inject('CONFIG_OPTIONS') private options: { configPath?: string },
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    try {
      const configPath = this.options.configPath || process.env.CONFIG_PATH || './config/Zconfig.json';
      
      this.logger.log(`Loading configuration from: ${configPath}`, 'ConfigService');
      
      this.config = loadConfig({
        configPath,
        throwOnError: true,
        logErrors: true,
      });

      this.logger.log(
        `Configuration loaded successfully. LPARs configured: ${Object.keys(this.config.dds).join(', ')}`,
        'ConfigService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to load configuration: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
        'ConfigService',
      );
      throw error;
    }
  }

  /**
   * Get the full configuration
   */
  getConfig(): ZConfig {
    return this.config;
  }

  /**
   * Get app-level configuration
   */
  getApp() {
    return {
      url: this.config.appurl,
      port: this.config.appport,
      httpType: this.config.zebra_httptype,
    };
  }

  /**
   * Get MongoDB configuration
   */
  getMongo() {
    return {
      url: this.config.mongourl,
      port: this.config.mongoport,
      database: this.config.dbname,
      useAuth: this.config.useDbAuth,
      user: this.config.dbUser,
      password: this.config.dbPassword,
      authSource: this.config.authSource,
    };
  }

  /**
   * Get Grafana configuration
   */
  getGrafana() {
    return {
      url: this.config.grafanaurl,
      port: this.config.grafanaport,
      httpType: this.config.grafanahttptype,
    };
  }

  /**
   * Get all configured LPARs
   */
  getLpars(): string[] {
    return Object.keys(this.config.dds);
  }

  /**
   * Get LPAR configuration by name
   */
  getLparConfig(lparName: string) {
    const lparConfig = this.config.dds[lparName];
    if (!lparConfig) {
      throw new Error(`LPAR ${lparName} not found in configuration`);
    }
    return lparConfig;
  }

  /**
   * Get RMF intervals
   */
  getIntervals() {
    return {
      rmf3: this.config.rmf3interval,
      rmfpp: this.config.ppminutesInterval,
    };
  }

  /**
   * Check if MongoDB is enabled for an LPAR
   */
  isMongoEnabledForLpar(lparName: string): boolean {
    const lparConfig = this.getLparConfig(lparName);
    return Boolean(lparConfig.useMongo ?? false);
  }

  /**
   * Check if Prometheus is enabled for an LPAR
   */
  isPrometheusEnabledForLpar(lparName: string): boolean {
    const lparConfig = this.getLparConfig(lparName);
    return Boolean(lparConfig.usePrometheus ?? false);
  }

  /**
   * Get config file path
   */
  private getConfigPath(): string {
    return this.options.configPath || process.env.CONFIG_PATH || './config/Zconfig.json';
  }

  /**
   * Update general configuration settings
   */
  async updateConfig(updates: Partial<ZConfig>): Promise<void> {
    // Merge updates with existing config
    this.config = {
      ...this.config,
      ...updates,
    };

    // Persist to file
    await this.persistConfig();

    this.logger.log('Configuration updated successfully', 'ConfigService');
  }

  /**
   * Update or create LPAR configuration
   */
  async updateLparConfig(lparName: string, updates: Partial<ZConfig['dds'][string]>): Promise<void> {
    if (!this.config.dds[lparName]) {
      this.config.dds[lparName] = {} as any;
    }

    // Deep merge the updates
    this.config.dds[lparName] = this.deepMerge(this.config.dds[lparName], updates);

    // Persist to file
    await this.persistConfig();

    this.logger.log(`LPAR ${lparName} configuration updated successfully`, 'ConfigService');
  }

  /**
   * Save/replace entire LPAR configuration
   */
  async saveLparConfig(lparName: string, config: ZConfig['dds'][string]): Promise<void> {
    this.config.dds[lparName] = config;

    // Persist to file
    await this.persistConfig();

    this.logger.log(`LPAR ${lparName} configuration saved successfully`, 'ConfigService');
  }

  /**
   * Delete LPAR configuration
   */
  async deleteLparConfig(lparName: string): Promise<void> {
    delete this.config.dds[lparName];

    // Persist to file
    await this.persistConfig();

    this.logger.log(`LPAR ${lparName} configuration deleted successfully`, 'ConfigService');
  }

  /**
   * Persist configuration to file
   */
  private async persistConfig(): Promise<void> {
    const configPath = this.getConfigPath();
    const absolutePath = path.resolve(configPath);

    try {
      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });

      // Write config with formatting
      await fs.writeFile(
        absolutePath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );

      this.logger.log(`Configuration persisted to ${absolutePath}`, 'ConfigService');
    } catch (error) {
      this.logger.error(
        `Failed to persist configuration: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
        'ConfigService',
      );
      throw error;
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const output = { ...target } as T;
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        const sourceValue = source[key as keyof T];
        if (this.isObject(sourceValue)) {
          if (!(key in target)) {
            (output as any)[key] = sourceValue;
          } else {
            (output as any)[key] = this.deepMerge(
              (target as any)[key],
              sourceValue as any
            );
          }
        } else {
          (output as any)[key] = sourceValue;
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  private isObject(item: any): item is Record<string, any> {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

