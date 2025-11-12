/**
 * RMF Monitor III Service
 * Fetches and parses real-time RMF metrics from DDS
 */
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as xml2js from 'xml2js';
import { firstValueFrom } from 'rxjs';
import type { RMFMonitor3ResponseDTO } from '@zebra/shared/dtos';
import { REPORT_TYPE_MAP } from '@zebra/shared/constants';

interface RMF3Params {
  report: string;
  resource?: string;
  id?: string;
  [key: string]: string | undefined;
}

interface DDSMLReport {
  ddsml?: {
    report?: Array<{
      'time-data'?: Array<{
        'display-start'?: Array<{ _?: string }>;
        'display-end'?: Array<{ _?: string }>;
      }>;
      'column-headers'?: Array<{
        col?: Array<{ _?: string }>;
      }>;
      metric?: Array<{
        description?: Array<string>;
      }>;
      caption?: Array<{
        var?: Array<{
          name?: Array<string>;
          value?: Array<string>;
        }>;
      }>;
      row?: Array<{
        col?: Array<string>;
      }>;
    }>;
  };
}

@Injectable()
export class RMF3Service {
  private readonly parser: xml2js.Parser;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Initialize xml2js parser (same as legacy code)
    this.parser = new xml2js.Parser();
  }

  /**
   * Fetch RMF Monitor III report for a specific LPAR
   */
  async getReport(lpar: string, report: string, params?: Record<string, string>): Promise<RMFMonitor3ResponseDTO> {
    // Validate LPAR exists
    const lparConfig = this.config.getLparConfig(lpar);
    if (!lparConfig) {
      throw new NotFoundException(`LPAR '${lpar}' not found in configuration`);
    }

    // Build DDS URL
    const baseUrl = this.buildDDSUrl(lparConfig);
    const rmf3Filename = lparConfig.rmf3filename || 'rmfm3.xml';

    // Build query parameters
    const queryParams: RMF3Params = {
      report,
      ...params,
    };

    // Add resource parameter if not provided
    if (!queryParams.resource) {
      queryParams.resource = this.buildResourceString(lpar, report);
    }

    const fullUrl = this.buildRequestUrl(baseUrl, rmf3Filename, queryParams);

    try {
      this.logger.log(`Fetching RMF3 report: ${report} for LPAR: ${lpar}`, 'RMF3Service');

      // Make HTTP request with TLS v1.0 support for legacy mainframes
      const response = await firstValueFrom(
        this.http.get(fullUrl, {
          auth:
            lparConfig.ddsauth === 'true'
              ? {
                  username: lparConfig.ddsuser || '',
                  password: lparConfig.ddspwd || '',
                }
              : undefined,
          headers: {
            Accept: 'application/xml, text/xml',
          },
          httpsAgent: new (require('https').Agent)({
            minVersion: 'TLSv1',
            maxVersion: 'TLSv1.2',
            rejectUnauthorized: false, // Allow self-signed certs for mainframe
          }),
        }),
      );

      // Parse XML response
      const parsedData = await this.parseXML(response.data);

      // Add metadata
      const result: RMFMonitor3ResponseDTO = {
        ...parsedData,
        metadata: {
          lpar,
          report,
          fetchedAt: new Date().toISOString(),
        },
      };

      this.logger.log(`Successfully fetched RMF3 report: ${report} for LPAR: ${lpar}`, 'RMF3Service');

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch RMF3 report: ${report} for LPAR: ${lpar}`, error.stack, 'RMF3Service');

      if (error.response?.status === 404) {
        throw new NotFoundException(`RMF3 report '${report}' not found for LPAR '${lpar}'`);
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestException('Authentication failed for DDS server');
      }

      throw new InternalServerErrorException(`Failed to fetch RMF3 data: ${error.message}`);
    }
  }

  /**
   * Parse XML response from DDS (using xml2js - same as legacy code)
   */
  private async parseXML(xml: string): Promise<Omit<RMFMonitor3ResponseDTO, 'metadata'>> {
    return new Promise((resolve, reject) => {
      this.parser.parseString(xml, (err, result: DDSMLReport) => {
        if (err) {
          this.logger.error('XML parsing error', err.stack || err.message, 'RMF3Service');
          return reject(new InternalServerErrorException('Failed to parse RMF3 XML response'));
        }

        try {
      if (!result?.ddsml?.report?.[0]) {
        throw new Error('Invalid XML structure: missing ddsml.report');
      }

      const report = result.ddsml.report[0];

          // Extract basic information (same structure as legacy parser)
      const timestart = report['time-data']?.[0]?.['display-start']?.[0]?._ || '';
      const timeend = report['time-data']?.[0]?.['display-end']?.[0]?._ || '';
      const title = report.metric?.[0]?.description?.[0] || 'RMF Monitor III Report';

      // Extract column headers
      const columnHeaders = report['column-headers']?.[0]?.col || [];
      const columnhead = columnHeaders.map((col) => (typeof col === 'object' && col._ ? col._ : String(col)));

      // Extract caption (optional)
      let caption: Record<string, string> | undefined;
      if (report.caption?.[0]?.var) {
        caption = {};
        for (const v of report.caption[0].var) {
          const name = v.name?.[0];
          const value = v.value?.[0];
          if (name && value) {
            caption[name] = value;
          }
        }
      }

      // Extract table data
      const table: Array<Record<string, string>> = [];
      if (report.row) {
        for (const row of report.row) {
          if (row.col) {
            const rowData: Record<string, string> = {};
            for (let i = 0; i < columnhead.length && i < row.col.length; i++) {
              rowData[columnhead[i]] = row.col[i];
            }
            table.push(rowData);
          }
        }
      }

          resolve({
        title,
        timestart,
        timeend,
        columnhead,
        caption,
        table,
          });
    } catch (error) {
          this.logger.error('XML structure parsing failed', error.stack, 'RMF3Service');
          reject(new InternalServerErrorException('Failed to parse RMF3 XML structure'));
    }
      });
    });
  }

  /**
   * Build DDS base URL
   */
  private buildDDSUrl(lparConfig: any): string {
    const protocol = lparConfig.ddshhttptype || 'http';
    const host = lparConfig.ddsbaseurl;
    const port = lparConfig.ddsbaseport;

    if (!host || !port) {
      throw new BadRequestException('Invalid DDS configuration: missing baseurl or baseport');
    }

    return `${protocol}://${host}:${port}`;
  }

  /**
   * Build full request URL with query parameters
   */
  private buildRequestUrl(baseUrl: string, filename: string, params: RMF3Params): string {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return `${baseUrl}/gpm/${filename}?${queryString}`;
  }

  /**
   * Build resource string for RMF3 request
   * Format: ,LPARNAME,MVS_IMAGE or ,LPARNAME,SYSPLEX
   */
  private buildResourceString(lpar: string, report: string): string {
    const resourceType = REPORT_TYPE_MAP[report] || 'MVS_IMAGE';
    return `,${lpar},${resourceType}`;
  }
}

