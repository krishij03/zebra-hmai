/**
 * DCOL Service
 * Handles DCOL data queries from MySQL (similar to HMAI/HMRE)
 */
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as mysql from 'mysql2/promise';
import type { DCOLQueryRequestDTO, DCOLQueryResponseDTO } from '@zebra/shared/dtos';

@Injectable()
export class DCOLService {
  private connectionPools: Map<string, mysql.Pool> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Query DCOL data from MySQL
   * Note: DCOL uses a single table, so 'type' is not needed in the request
   */
  async queryData(lpar: string, request: DCOLQueryRequestDTO): Promise<DCOLQueryResponseDTO> {
    try {
      const lparConfig = this.config.getLparConfig(lpar);
      if (!lparConfig || !lparConfig.dcol) {
        throw new NotFoundException(`DCOL not configured for LPAR '${lpar}'`);
      }

      const pool = this.getConnectionPool(lpar, lparConfig.dcol.mysql);
      const { sql, params } = this.buildQuery(request);
      const [rows] = await pool.execute(sql, params);

      const countSql = this.buildCountQuery(request);
      const [countRows] = await pool.execute(countSql, params.slice(0, -2));
      const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).count : 0;

      const pagination = request.pagination || { page: 1, limit: 100 };

      return {
        lpar,
        data: rows as Array<Record<string, string>>,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to query DCOL data for ${lpar}`, error.stack, 'DCOLService');
      throw new InternalServerErrorException(`Failed to query DCOL data: ${error.message}`);
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
        database: mysqlConfig.database || 'DCOL',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      this.connectionPools.set(lpar, pool);
      this.logger.log(`Created MySQL connection pool for DCOL ${lpar}`, 'DCOLService');
    }

    return pool;
  }

  private buildQuery(request: DCOLQueryRequestDTO): { sql: string; params: any[] } {
    // DCOL uses a default table name
    const tableName = 'dcol';
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

  private buildCountQuery(request: DCOLQueryRequestDTO): string {
    const tableName = 'dcol';
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
        this.logger.log(`Closed MySQL connection pool for DCOL ${lpar}`, 'DCOLService');
      } catch (error) {
        this.logger.error(`Failed to close pool for DCOL ${lpar}`, error.stack, 'DCOLService');
      }
    }
  }
}

