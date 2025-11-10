/**
 * HMAI Database Service
 * Handles MySQL database operations for HMAI ingestion
 */
import { Injectable } from '@nestjs/common';
import { createConnection, Connection } from 'mysql2/promise';
import { PassThrough } from 'stream';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '../config/config.service';
import {
  HMAIMetric,
  TABLE_SCHEMAS,
  TABLE_HEADERS,
} from './hmai-tables';

@Injectable()
export class HMAIDatabaseService {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create MySQL connection for an LPAR
   */
  async createConnection(lpar: string): Promise<Connection> {
    const lparConfig = this.config.getLparConfig(lpar);
    
    if (!lparConfig?.hmai?.mysql) {
      throw new Error(`HMAI MySQL configuration not found for LPAR '${lpar}'`);
    }

    const mysqlConfig = lparConfig.hmai.mysql;

    try {
      const connection = await createConnection({
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        multipleStatements: true,
        // Enable LOAD DATA LOCAL INFILE
        flags: ['+LOCAL_FILES'],
      });

      this.logger.log(
        `MySQL connection established for ${lpar}`,
        'HMAIDatabaseService',
      );

      return connection;
    } catch (error) {
      this.logger.error(
        `Failed to connect to MySQL for ${lpar}: ${error.message}`,
        error.stack,
        'HMAIDatabaseService',
      );
      throw error;
    }
  }

  /**
   * Ensure database exists and is selected
   */
  async ensureDatabase(connection: Connection, lpar: string): Promise<boolean> {
    try {
      // Check if database exists
      const [rows]: any = await connection.query(
        `SHOW DATABASES LIKE '${lpar}'`,
      );

      let databaseCreated = false;

      if (rows.length === 0) {
        // Create database
        await connection.query(`CREATE DATABASE ${lpar}`);
        databaseCreated = true;
        this.logger.log(
          `Database ${lpar} created`,
          'HMAIDatabaseService',
        );
      }

      // Use the database
      await connection.query(`USE ${lpar}`);
      this.logger.log(`Using database ${lpar}`, 'HMAIDatabaseService');

      return databaseCreated;
    } catch (error) {
      this.logger.error(
        `Failed to ensure database ${lpar}: ${error.message}`,
        error.stack,
        'HMAIDatabaseService',
      );
      throw error;
    }
  }

  /**
   * Create tables for specified metrics
   */
  async createTables(
    connection: Connection,
    metrics: HMAIMetric[],
  ): Promise<void> {
    try {
      for (const metric of metrics) {
        const createTableSQL = TABLE_SCHEMAS[metric];
        if (createTableSQL) {
          await connection.query(createTableSQL);
          this.logger.log(
            `Table '${metric}' verified/created`,
            'HMAIDatabaseService',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to create tables: ${error.message}`,
        error.stack,
        'HMAIDatabaseService',
      );
      throw error;
    }
  }

  /**
   * Load CSV data from stream into MySQL table
   * Uses LOAD DATA LOCAL INFILE for high performance bulk inserts
   */
  async loadDataFromStream(
    connection: Connection,
    readStream: NodeJS.ReadableStream,
    tableName: HMAIMetric,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const passthroughStream = new PassThrough();
      (readStream as any).pipe(passthroughStream);

      const columns = TABLE_HEADERS[tableName];
      const sql = `LOAD DATA LOCAL INFILE 'stdin' INTO TABLE ${tableName} 
                   FIELDS TERMINATED BY ',' ENCLOSED BY '"' 
                   LINES TERMINATED BY '\\n' 
                   IGNORE 1 LINES (${columns.join(', ')})`;

      connection
        .query({
          sql,
          infileStreamFactory: () => passthroughStream,
        } as any)
        .then(([result]: any) => {
          const affectedRows = result.affectedRows || 0;
          this.logger.log(
            `Loaded ${affectedRows} rows into ${tableName}`,
            'HMAIDatabaseService',
          );
          resolve(affectedRows);
        })
        .catch((error) => {
          this.logger.error(
            `Failed to load data into ${tableName}: ${error.message}`,
            error.stack,
            'HMAIDatabaseService',
          );
          reject(error);
        });
    });
  }

  /**
   * Enforce data retention policies
   * Deletes data older than the retention period for each metric
   */
  async enforceDataRetention(
    connection: Connection,
    lpar: string,
    metrics: HMAIMetric[],
  ): Promise<void> {
    const lparConfig = this.config.getLparConfig(lpar);
    const retentionConfig = lparConfig?.hmai?.dataRetention;

    if (!retentionConfig) {
      this.logger.log(
        `No retention policy configured for ${lpar}`,
        'HMAIDatabaseService',
      );
      return;
    }

    try {
      for (const metric of metrics) {
        const retentionDays = retentionConfig[metric];
        
        if (retentionDays) {
          const sql = `DELETE FROM ${metric} 
                       WHERE TIMESTAMP < DATE_SUB(NOW(), INTERVAL ${retentionDays} DAY)`;

          const [result]: any = await connection.query(sql);
          
          if (result.affectedRows > 0) {
            this.logger.log(
              `Deleted ${result.affectedRows} old rows from ${metric} (retention: ${retentionDays} days)`,
              'HMAIDatabaseService',
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to enforce data retention for ${lpar}: ${error.message}`,
        error.stack,
        'HMAIDatabaseService',
      );
      // Don't throw - retention is not critical
    }
  }

  /**
   * Close MySQL connection
   */
  async closeConnection(connection: Connection): Promise<void> {
    try {
      await connection.end();
      this.logger.log('MySQL connection closed', 'HMAIDatabaseService');
    } catch (error) {
      this.logger.warn(
        `Error closing MySQL connection: ${error.message}`,
        'HMAIDatabaseService',
      );
    }
  }
}


