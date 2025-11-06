/**
 * HMRE Service
 * Handles HMRE data queries from MySQL (similar to HMAI)
 */
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as mysql from 'mysql2/promise';
import type { HMREQueryRequestDTO, HMREQueryResponseDTO } from '@zebra/shared/dtos';

@Injectable()
export class HMREService {
  private connectionPools: Map<string, mysql.Pool> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Query HMRE data from MySQL
   */
  async queryData(lpar: string, request: HMREQueryRequestDTO): Promise<HMREQueryResponseDTO> {
    const startTime = Date.now();

    try {
      const lparConfig = this.config.getLparConfig(lpar);
      if (!lparConfig || !lparConfig.hmre) {
        throw new NotFoundException(`HMRE not configured for LPAR '${lpar}'`);
      }

      const pool = this.getConnectionPool(lpar, lparConfig.hmre.mysql);
      const { sql, params } = this.buildQuery(request);
      const [rows] = await pool.execute(sql, params);

      const countSql = this.buildCountQuery(request);
      const [countRows] = await pool.execute(countSql, params.slice(0, -2));
      const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).count : 0;

      const pagination = request.pagination || { page: 1, limit: 100 };
      const executionTime = Date.now() - startTime;

      return {
        lpar,
        type: request.type,
        data: rows as Array<Record<string, string>>,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to query HMRE data for ${lpar}/${request.type}`, error.stack, 'HMREService');
      throw new InternalServerErrorException(`Failed to query HMRE data: ${error.message}`);
    }
  }

  private getConnectionPool(lpar: string, mysqlConfig: any): mysql.Pool {
    let pool = this.connectionPools.get(lpar);

    if (!pool) {
      pool = mysql.createPool({
        host: mysqlConfig.host,
        port: mysqlConfig.port || 3306,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database || 'HMRE',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      this.connectionPools.set(lpar, pool);
      this.logger.log(`Created MySQL connection pool for HMRE ${lpar}`, 'HMREService');
    }

    return pool;
  }

  private buildQuery(request: HMREQueryRequestDTO): { sql: string; params: any[] } {
    const tableName = request.type;
    const params: any[] = [];
    let sql = `SELECT * FROM ${mysql.escapeId(tableName)}`;

    const whereClauses: string[] = [];

    if (request.timeRange?.start) {
      whereClauses.push('timestamp >= ?');
      params.push(new Date(request.timeRange.start));
    }

    if (request.timeRange?.end) {
      whereClauses.push('timestamp <= ?');
      params.push(new Date(request.timeRange.end));
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ' ORDER BY timestamp DESC';

    const pagination = request.pagination || { page: 1, limit: 100 };
    const offset = (pagination.page - 1) * pagination.limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(pagination.limit, offset);

    return { sql, params };
  }

  private buildCountQuery(request: HMREQueryRequestDTO): string {
    const tableName = request.type;
    let sql = `SELECT COUNT(*) as count FROM ${mysql.escapeId(tableName)}`;

    const whereClauses: string[] = [];

    if (request.timeRange?.start) {
      whereClauses.push('timestamp >= ?');
    }

    if (request.timeRange?.end) {
      whereClauses.push('timestamp <= ?');
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    return sql;
  }

  async onModuleDestroy() {
    for (const [lpar, pool] of this.connectionPools.entries()) {
      try {
        await pool.end();
        this.logger.log(`Closed MySQL connection pool for HMRE ${lpar}`, 'HMREService');
      } catch (error) {
        this.logger.error(`Failed to close pool for HMRE ${lpar}`, error.stack, 'HMREService');
      }
    }
  }
}

