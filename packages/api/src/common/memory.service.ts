/**
 * Memory Service
 * Base service for tracking processed data (equivalent to legacy JSON controllers)
 * Used by HMAI, HMRE, DCOL, Cache, Device modules for FTP ingestion tracking
 */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LoggerService } from '../logger/logger.service';

export interface MemoryData {
  [key: string]: any;
}

@Injectable()
export class MemoryService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Get memory directory for a specific module
   * Uses packages/api/config/ if running from monorepo, otherwise uses config/ relative to project root
   */
  private getMemoryDir(module: string): string {
    // Check if we're in the packages/api directory
    const cwd = process.cwd();
    const configPath = cwd.endsWith('packages/api') || cwd.endsWith('packages\\api')
      ? path.join(cwd, '..', '..', 'config', `${module}Memory`)
      : path.join(cwd, 'config', `${module}Memory`);
    
    return configPath;
  }

  /**
   * Get memory file path for an LPAR
   */
  private getMemoryFilePath(module: string, lpar: string): string {
    return path.join(this.getMemoryDir(module), `${lpar}.json`);
  }

  /**
   * Ensure memory directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  }

  /**
   * Read LPAR memory data
   * Legacy equivalent: hmaiJSONController.readLparData()
   */
  async readLparData(module: string, lpar: string): Promise<MemoryData> {
    const filePath = this.getMemoryFilePath(module, lpar);
    
    try {
      await this.ensureDirectoryExists(this.getMemoryDir(module));
      
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, initialize with empty object
        this.logger.log(
          `No existing memory data for ${module}/${lpar}, initializing with empty object`,
          'MemoryService',
        );
        await this.writeLparData(module, lpar, {});
        return {};
      }
      
      this.logger.error(
        `Failed to read memory data for ${module}/${lpar}: ${error.message}`,
        error.stack,
        'MemoryService',
      );
      throw error;
    }
  }

  /**
   * Write LPAR memory data
   * Legacy equivalent: hmaiJSONController.writeLparData()
   */
  async writeLparData(module: string, lpar: string, data: MemoryData): Promise<void> {
    const filePath = this.getMemoryFilePath(module, lpar);
    
    try {
      await this.ensureDirectoryExists(this.getMemoryDir(module));
      
      await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      
      this.logger.log(
        `Memory data written successfully for ${module}/${lpar}`,
        'MemoryService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to write memory data for ${module}/${lpar}: ${error.message}`,
        error.stack,
        'MemoryService',
      );
      throw error;
    }
  }

  /**
   * Update LPAR memory data (merge with existing)
   * Legacy equivalent: hmaiJSONController.updateLparData()
   */
  async updateLparData(module: string, lpar: string, newData: MemoryData): Promise<MemoryData> {
    try {
      const currentData = await this.readLparData(module, lpar);
      
      // Deep merge the new data with existing data
      const mergedData = this.deepMerge(currentData, newData);
      
      await this.writeLparData(module, lpar, mergedData);
      
      return mergedData;
    } catch (error) {
      this.logger.error(
        `Failed to update memory data for ${module}/${lpar}: ${error.message}`,
        error.stack,
        'MemoryService',
      );
      throw error;
    }
  }

  /**
   * Clear memory data for an LPAR
   */
  async clearLparData(module: string, lpar: string): Promise<void> {
    await this.writeLparData(module, lpar, {});
    this.logger.log(`Memory data cleared for ${module}/${lpar}`, 'MemoryService');
  }

  /**
   * Check if a timestamp/directory has been processed
   * Common pattern: memory[dirName] = { timestamp: '...', processedMetrics: [...] }
   */
  async isProcessed(
    module: string,
    lpar: string,
    identifier: string,
    metric?: string,
  ): Promise<boolean> {
    try {
      const memory = await this.readLparData(module, lpar);
      
      if (!memory[identifier]) {
        return false;
      }
      
      // If checking for a specific metric
      if (metric && memory[identifier].processedMetrics) {
        return memory[identifier].processedMetrics.includes(metric);
      }
      
      // Otherwise, identifier exists = processed
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark an identifier as processed
   */
  async markAsProcessed(
    module: string,
    lpar: string,
    identifier: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const memory = await this.readLparData(module, lpar);
    
    memory[identifier] = {
      ...memory[identifier],
      ...metadata,
      processedAt: new Date().toISOString(),
    };
    
    await this.writeLparData(module, lpar, memory);
  }

  /**
   * Add a metric to processed list for an identifier
   */
  async addProcessedMetric(
    module: string,
    lpar: string,
    identifier: string,
    metric: string,
  ): Promise<void> {
    const memory = await this.readLparData(module, lpar);
    
    if (!memory[identifier]) {
      memory[identifier] = {
        processedMetrics: [],
        processedAt: new Date().toISOString(),
      };
    }
    
    if (!memory[identifier].processedMetrics) {
      memory[identifier].processedMetrics = [];
    }
    
    if (!memory[identifier].processedMetrics.includes(metric)) {
      memory[identifier].processedMetrics.push(metric);
    }
    
    await this.writeLparData(module, lpar, memory);
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

