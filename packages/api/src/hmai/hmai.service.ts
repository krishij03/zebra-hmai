/**
 * HMAI Service
 * Handles HMAI data queries from MySQL
 */
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as mysql from 'mysql2/promise';
import type { HMAIQueryRequestDTO, HMAIQueryResponseDTO } from '@zebra/shared/dtos';

@Injectable()
export class HMAIService {
  private connectionPools: Map<string, mysql.Pool> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Query HMAI data from MySQL
   */
  async queryData(lpar: string, request: HMAIQueryRequestDTO): Promise<HMAIQueryResponseDTO> {
    const startTime = Date.now();

    try {
      // Validate LPAR exists
      const lparConfig = this.config.getLparConfig(lpar);
      if (!lparConfig || !lparConfig.hmai) {
        throw new NotFoundException(`HMAI not configured for LPAR '${lpar}'`);
      }

      // Get or create connection pool
      const pool = this.getConnectionPool(lpar, lparConfig.hmai.mysql);

      // Build query
      const { sql, params } = this.buildQuery(request);

      // Execute query
      const [rows] = await pool.execute(sql, params);

      // Count total rows for pagination
      const countSql = this.buildCountQuery(request);
      const [countRows] = await pool.execute(countSql, params.slice(0, -2)); // Remove limit/offset params
      const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).count : 0;

      const pagination = request.pagination || { page: 1, limit: 100 };

      const executionTime = Date.now() - startTime;

      return {
        lpar,
        metric: request.metric,
        data: rows as Array<Record<string, string>>,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
        executionTime,
      };
    } catch (error) {
      this.logger.error(`Failed to query HMAI data for ${lpar}/${request.metric}`, error.stack, 'HMAIService');
      throw new InternalServerErrorException(`Failed to query HMAI data: ${error.message}`);
    }
  }

  /**
   * Get or create MySQL connection pool for LPAR
   */
  private getConnectionPool(lpar: string, mysqlConfig: any): mysql.Pool {
    let pool = this.connectionPools.get(lpar);

    if (!pool) {
      pool = mysql.createPool({
        host: mysqlConfig.host,
        port: mysqlConfig.port || 3306,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database || 'HMAI',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      this.connectionPools.set(lpar, pool);
      this.logger.log(`Created MySQL connection pool for LPAR ${lpar}`, 'HMAIService');
    }

    return pool;
  }

  /**
   * Build SQL query from request
   */
  private buildQuery(request: HMAIQueryRequestDTO): { sql: string; params: any[] } {
    const tableName = request.metric;
    const params: any[] = [];

    let sql = `SELECT * FROM ${mysql.escapeId(tableName)}`;

    // Add WHERE clauses
    const whereClauses: string[] = [];

    // Time range filter
    if (request.timeRange?.start) {
      whereClauses.push('timestamp >= ?');
      params.push(new Date(request.timeRange.start));
    }

    if (request.timeRange?.end) {
      whereClauses.push('timestamp <= ?');
      params.push(new Date(request.timeRange.end));
    }

    // Additional filters
    if (request.filters) {
      for (const [field, value] of Object.entries(request.filters)) {
        whereClauses.push(`${mysql.escapeId(field)} = ?`);
        params.push(value);
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sorting
    if (request.sort) {
      sql += ` ORDER BY ${mysql.escapeId(request.sort.field)} ${request.sort.order.toUpperCase()}`;
    } else {
      sql += ' ORDER BY timestamp DESC';
    }

    // Pagination
    const pagination = request.pagination || { page: 1, limit: 100 };
    const offset = (pagination.page - 1) * pagination.limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(pagination.limit, offset);

    return { sql, params };
  }

  /**
   * Build count query for pagination
   */
  private buildCountQuery(request: HMAIQueryRequestDTO): string {
    const tableName = request.metric;
    let sql = `SELECT COUNT(*) as count FROM ${mysql.escapeId(tableName)}`;

    const whereClauses: string[] = [];

    if (request.timeRange?.start) {
      whereClauses.push('timestamp >= ?');
    }

    if (request.timeRange?.end) {
      whereClauses.push('timestamp <= ?');
    }

    if (request.filters) {
      for (const field of Object.keys(request.filters)) {
        whereClauses.push(`${mysql.escapeId(field)} = ?`);
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    return sql;
  }

  /**
   * Close all connection pools (cleanup)
   */
  async onModuleDestroy() {
    for (const [lpar, pool] of this.connectionPools.entries()) {
      try {
        await pool.end();
        this.logger.log(`Closed MySQL connection pool for LPAR ${lpar}`, 'HMAIService');
      } catch (error) {
        this.logger.error(`Failed to close pool for ${lpar}`, error.stack, 'HMAIService');
      }
    }
  }
}

